/**
 * PresenceService
 * Tracks connected users, active files, cursor positions, and room presence.
 * Assigns deterministic distinct visual colors for collaborator badges/cursors.
 *
 * CRITICAL ARCHITECTURE:
 * Presence is keyed strictly by unique authenticated `userId` (MongoDB ObjectId string).
 * A single user can have multiple concurrent WebSocket connections (tabs, reconnects, remounts).
 * Multiple sockets for the same user are tracked internally under that user's presence record.
 * A 1200ms departure grace period ensures page refreshes, reconnects, and React remounts
 * do not cause false departure/re-join flickers in presence or the activity feed.
 */

const COLLABORATOR_PALETTE = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#6366f1", // Indigo
  "#e11d48", // Rose
];

class PresenceService {
  constructor() {
    // Map of projectId -> Map of userId -> UserPresenceRecord
    this.rooms = new Map();
    // Reverse lookup: Map of socketId -> { projectId, userId }
    this.socketIndex = new Map();
    // Pending departures grace timer map: Map of `${projectId}:${userId}` -> { timer, leftPresence }
    this.pendingDepartures = new Map();
    // Callback when a user's final connection genuinely departs after grace period
    this.onDepartureCallback = null;
  }

  setOnDeparture(callback) {
    this.onDepartureCallback = callback;
  }

  /**
   * Deterministically assign a color for a user based on stable userId
   */
  getColorForUser(userId) {
    if (!userId) return COLLABORATOR_PALETTE[0];
    let hash = 0;
    const str = userId.toString();
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % COLLABORATOR_PALETTE.length;
    return COLLABORATOR_PALETTE[index];
  }

  /**
   * Add a connected user socket to a project room
   * Returns { presence, isFirstJoin }
   */
  joinRoom(projectId, socketId, user, ws) {
    const projId = projectId.toString();
    const userId = (user._id || user.id).toString();
    const depKey = `${projId}:${userId}`;

    // Cancel any pending departure timer for this user (reconnect or page reload)
    let hadPendingDeparture = false;
    if (this.pendingDepartures.has(depKey)) {
      const pending = this.pendingDepartures.get(depKey);
      clearTimeout(pending.timer);
      this.pendingDepartures.delete(depKey);
      hadPendingDeparture = true;
    }

    if (!this.rooms.has(projId)) {
      this.rooms.set(projId, new Map());
    }

    const room = this.rooms.get(projId);
    let isFirstJoin = false;
    let presence = room.get(userId);

    if (!presence) {
      // First connection for this authenticated user in this room
      isFirstJoin = true;
      presence = {
        userId,
        name: user.name || "Collaborator",
        email: user.email || "",
        color: this.getColorForUser(userId),
        currentFileId: null,
        currentFileName: null,
        cursor: null,
        selection: null,
        status: "active",
        joinedAt: Date.now(),
        lastActive: Date.now(),
        sockets: new Map(),
      };
      room.set(userId, presence);
    } else {
      // User is already in the room (e.g. additional tab, or reconnected within grace period)
      presence.name = user.name || presence.name;
      presence.email = user.email || presence.email;
      presence.status = "active";
      presence.lastActive = Date.now();

      // Prune any disconnected sockets previously tracked
      for (const [sockId, s] of presence.sockets.entries()) {
        if (!s.ws || s.ws.readyState !== 1) {
          presence.sockets.delete(sockId);
          this.socketIndex.delete(sockId);
        }
      }

      // If user had no active sockets and had NO pending departure, it's a first join
      if (presence.sockets.size === 0 && !hadPendingDeparture) {
        isFirstJoin = true;
      }
    }

    // Register this socket
    presence.sockets.set(socketId, {
      socketId,
      ws,
      joinedAt: Date.now(),
    });

    this.socketIndex.set(socketId, { projectId: projId, userId });

    return {
      presence: this._serializeUser(presence, socketId),
      isFirstJoin,
    };
  }

  /**
   * Remove a socket connection from a project room
   * If immediate is false, applies a 1200ms grace period before finalizing departure
   * Returns { leftPresence, isFinalDeparture, remainingConnections }
   */
  leaveRoom(projectId, socketId, immediate = false) {
    const projId = projectId.toString();
    const indexInfo = this.socketIndex.get(socketId);
    this.socketIndex.delete(socketId);

    const room = this.rooms.get(projId);
    if (!room) return null;

    let targetUserId = indexInfo ? indexInfo.userId : null;

    // If not found in index, search by socketId
    if (!targetUserId) {
      for (const [uid, p] of room.entries()) {
        if (p.sockets.has(socketId)) {
          targetUserId = uid;
          break;
        }
      }
    }

    if (!targetUserId || !room.has(targetUserId)) return null;

    const presence = room.get(targetUserId);
    presence.sockets.delete(socketId);

    // Prune any other dead sockets
    for (const [sockId, s] of presence.sockets.entries()) {
      if (!s.ws || s.ws.readyState !== 1) {
        presence.sockets.delete(sockId);
        this.socketIndex.delete(sockId);
      }
    }

    const remainingConnections = presence.sockets.size;
    const serializedPresence = this._serializeUser(presence, socketId);

    if (remainingConnections > 0) {
      // User still has other active sockets
      return {
        leftPresence: serializedPresence,
        isFinalDeparture: false,
        remainingConnections,
      };
    }

    // All sockets closed for this user
    const depKey = `${projId}:${targetUserId}`;

    if (immediate) {
      // Immediate departure (e.g. explicit leave workspace or logout)
      if (this.pendingDepartures.has(depKey)) {
        clearTimeout(this.pendingDepartures.get(depKey).timer);
        this.pendingDepartures.delete(depKey);
      }
      room.delete(targetUserId);
      if (room.size === 0) {
        this.rooms.delete(projId);
      }
      if (this.onDepartureCallback) {
        this.onDepartureCallback(projId, targetUserId, serializedPresence);
      }
      return {
        leftPresence: serializedPresence,
        isFinalDeparture: true,
        remainingConnections: 0,
      };
    }

    // Delayed departure with grace period (1200ms) to absorb page refreshes / reconnects
    if (this.pendingDepartures.has(depKey)) {
      clearTimeout(this.pendingDepartures.get(depKey).timer);
    }

    const timer = setTimeout(() => {
      this.pendingDepartures.delete(depKey);
      const currentRoom = this.rooms.get(projId);
      if (currentRoom && currentRoom.has(targetUserId)) {
        const currentP = currentRoom.get(targetUserId);
        if (!currentP.sockets || currentP.sockets.size === 0) {
          currentRoom.delete(targetUserId);
          if (currentRoom.size === 0) {
            this.rooms.delete(projId);
          }
          if (this.onDepartureCallback) {
            this.onDepartureCallback(projId, targetUserId, serializedPresence);
          }
        }
      }
    }, 1200);

    this.pendingDepartures.set(depKey, { timer, serializedPresence });

    return {
      leftPresence: serializedPresence,
      isFinalDeparture: false, // will fire asynchronously if not reconnected
      isPendingDeparture: true,
      remainingConnections: 0,
    };
  }

  /**
   * Update presence details for a user (e.g. file switched, cursor moved)
   */
  updatePresence(projectId, socketId, updates) {
    const projId = projectId.toString();
    const room = this.rooms.get(projId);
    if (!room) return null;

    const indexInfo = this.socketIndex.get(socketId);
    const userId = indexInfo?.userId;

    let presence = userId ? room.get(userId) : null;
    if (!presence) {
      for (const p of room.values()) {
        if (p.sockets.has(socketId)) {
          presence = p;
          break;
        }
      }
    }

    if (!presence) return null;

    if (updates.currentFileId !== undefined) presence.currentFileId = updates.currentFileId;
    if (updates.currentFileName !== undefined) presence.currentFileName = updates.currentFileName;
    if (updates.cursor !== undefined) presence.cursor = updates.cursor;
    if (updates.selection !== undefined) presence.selection = updates.selection;
    if (updates.status !== undefined) presence.status = updates.status;
    presence.lastActive = Date.now();

    return this._serializeUser(presence, socketId);
  }

  /**
   * Get all active unique collaborators in a project room
   * If excludeUserId is passed, omits that user (e.g. to get only remote peers)
   */
  getRoomUsers(projectId, excludeUserId = null) {
    const projId = projectId.toString();
    if (!this.rooms.has(projId)) return [];

    const room = this.rooms.get(projId);
    const users = [];
    const excludeStr = excludeUserId ? excludeUserId.toString() : null;

    for (const p of room.values()) {
      if (excludeStr && p.userId === excludeStr) {
        continue;
      }

      // Prune dead sockets
      for (const [sockId, s] of p.sockets.entries()) {
        if (!s.ws || s.ws.readyState !== 1) {
          p.sockets.delete(sockId);
          this.socketIndex.delete(sockId);
        }
      }

      if (p.sockets.size === 0) continue;

      users.push(this._serializeUser(p));
    }

    return users;
  }

  /**
   * Get all active WebSockets connected to a project room across all users
   */
  getRoomSockets(projectId) {
    const projId = projectId.toString();
    if (!this.rooms.has(projId)) return [];

    const room = this.rooms.get(projId);
    const sockets = [];

    for (const p of room.values()) {
      for (const s of p.sockets.values()) {
        if (s.ws && s.ws.readyState === 1) {
          sockets.push({ socketId: s.socketId, ws: s.ws, userId: p.userId });
        }
      }
    }

    return sockets;
  }

  /**
   * Find user presence by socketId across all rooms
   */
  findUserBySocketId(socketId) {
    const indexInfo = this.socketIndex.get(socketId);
    if (indexInfo) {
      const room = this.rooms.get(indexInfo.projectId);
      if (room && room.has(indexInfo.userId)) {
        return {
          projectId: indexInfo.projectId,
          presence: this._serializeUser(room.get(indexInfo.userId), socketId),
        };
      }
    }
    return null;
  }

  /**
   * Format internal UserPresenceRecord for external consumers
   */
  _serializeUser(p, preferredSocketId = null) {
    if (!p) return null;
    const socketId =
      preferredSocketId ||
      (p.sockets && p.sockets.size > 0 ? Array.from(p.sockets.keys())[0] : null);

    return {
      socketId,
      userId: p.userId,
      name: p.name,
      email: p.email,
      color: p.color,
      currentFileId: p.currentFileId,
      currentFileName: p.currentFileName,
      cursor: p.cursor,
      selection: p.selection,
      status: p.status,
      joinedAt: p.joinedAt,
      lastActive: p.lastActive,
      connectionCount: p.sockets ? p.sockets.size : 1,
    };
  }
}

export const presenceService = new PresenceService();
export default presenceService;
