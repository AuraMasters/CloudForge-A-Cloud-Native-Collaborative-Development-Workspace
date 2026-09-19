import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import url from "url";
import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import Project from "../models/Project.js";
import collaborationService from "./collaborationService.js";
import presenceService from "./presenceService.js";
import collaborationActivityService from "./collaborationActivityService.js";

/**
 * CollaborationGateway
 * Dedicated WebSocket Gateway mounted on /ws/collaboration.
 * Handles authenticated room joins, CRDT incremental synchronization (Yjs),
 * live presence, cursor sharing, file operations, and Git activity broadcasts.
 */
class CollaborationGateway {
  constructor() {
    this.wss = null;
    this.socketMap = new Map(); // socketId -> { ws, projectId, user, pingTimer }
  }

  /**
   * Initializes the WebSocket Server (noServer: true to be upgraded by main HTTP server)
   */
  init() {
    this.wss = new WebSocketServer({
      noServer: true,
    });

    this.wss.on("connection", (ws, request) => {
      this._handleConnection(ws, request);
    });

    // Wire activity service broadcaster
    collaborationActivityService.setBroadcaster((projectId, payload, excludeWs) => {
      this.broadcastToRoom(projectId, payload, excludeWs);
    });

    // Wire presence service departure callback (called when 1200ms grace period expires)
    presenceService.setOnDeparture((projectId, userId, leftPresence) => {
      this.broadcastToRoom(projectId, {
        type: "user_left",
        socketId: leftPresence.socketId,
        userId,
        name: leftPresence.name,
        userName: leftPresence.name,
      });

      collaborationActivityService.recordLeave(
        projectId,
        { _id: userId, name: leftPresence.name },
        leftPresence.color
      );
    });

    console.log("CloudForge Collaboration WebSocket Gateway initialized on /ws/collaboration");
  }

  /**
   * Handle HTTP upgrade request delegated by the central upgrade router
   */
  handleUpgrade(request, socket, head) {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit("connection", ws, request);
    });
  }

  /**
   * Extract JWT token from Authorization header, Cookie, or URL query
   */
  _extractToken(request, query) {
    if (query.token) return query.token;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((c) => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith("token=")) {
          return cookie.substring(6);
        }
      }
    }

    return null;
  }

  /**
   * Main connection handler
   */
  async _handleConnection(ws, request) {
    const parsedUrl = new URL(request.url, "http://localhost");
    const query = Object.fromEntries(parsedUrl.searchParams.entries());
    const projectId = query.projectId;

    // Buffer any early incoming messages before async authentication completes
    const earlyQueue = [];
    let isReady = false;
    const earlyListener = (rawMessage) => {
      if (!isReady) {
        earlyQueue.push(rawMessage);
      }
    };
    ws.on("message", earlyListener);

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      ws.off("message", earlyListener);
      ws.send(JSON.stringify({ type: "error", message: "Invalid or missing projectId" }));
      ws.close(1008, "Invalid or missing projectId");
      return;
    }

    // 1. Authenticate JWT token
    const token = this._extractToken(request, query);
    if (!token) {
      ws.off("message", earlyListener);
      ws.send(JSON.stringify({ type: "error", message: "Authentication required" }));
      ws.close(1008, "Authentication required");
      return;
    }

    let user = null;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      user = await User.findById(userId).select("-password");
      if (!user) {
        ws.off("message", earlyListener);
        ws.send(JSON.stringify({ type: "error", message: "User not found" }));
        ws.close(1008, "User not found");
        return;
      }
    } catch (err) {
      ws.off("message", earlyListener);
      ws.send(JSON.stringify({ type: "error", message: "Invalid or expired token" }));
      ws.close(1008, "Invalid token");
      return;
    }

    // 2. Authorize project access (must be owner or collaborator)
    let project = null;
    try {
      project = await Project.findOne({
        _id: projectId,
        $or: [{ owner: user._id }, { collaborators: user._id }],
      });

      if (!project) {
        ws.off("message", earlyListener);
        ws.send(JSON.stringify({ type: "error", message: "Unauthorized access to project" }));
        ws.close(1008, "Unauthorized project access");
        return;
      }
    } catch (err) {
      ws.off("message", earlyListener);
      ws.send(JSON.stringify({ type: "error", message: "Database lookup failed" }));
      ws.close(1008, "Unauthorized project access");
      return;
    }

    const socketId = crypto.randomUUID();
    const { presence, isFirstJoin } = presenceService.joinRoom(projectId, socketId, user, ws);

    this.socketMap.set(socketId, {
      ws,
      projectId,
      user,
      socketId,
    });

    // 3. Send initial connected & room state message
    // Exclude current user from collaborators list so "You" is never duplicated
    const otherUsers = presenceService.getRoomUsers(projectId, user._id.toString());
    const recentActivities = collaborationActivityService.getRecentActivities(projectId, 50);

    ws.send(
      JSON.stringify({
        type: "connected",
        socketId,
        projectId,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          color: presence.color,
        },
        collaborators: otherUsers,
        activities: recentActivities,
      })
    );

    // 4. Notify other users in the room ONLY when this user genuinely becomes active (first socket)
    if (isFirstJoin) {
      this.broadcastToRoom(
        projectId,
        {
          type: "user_joined",
          collaborator: {
            socketId,
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            color: presence.color,
            status: "active",
            joinedAt: presence.joinedAt,
          },
        },
        ws
      );

      // Record join in authoritative activity feed
      collaborationActivityService.recordJoin(projectId, user, presence.color);
    }

    // 5. Handle incoming WebSocket messages
    isReady = true;
    ws.off("message", earlyListener);

    ws.on("message", async (rawMessage) => {
      try {
        const msg = JSON.parse(rawMessage.toString());
        await this._handleMessage(socketId, projectId, user, ws, msg);
      } catch (err) {
        console.error(`Error processing collaboration message from ${socketId}:`, err.message);
      }
    });

    // Drain queued early messages
    for (const rawMessage of earlyQueue) {
      try {
        const msg = JSON.parse(rawMessage.toString());
        await this._handleMessage(socketId, projectId, user, ws, msg);
      } catch (err) {
        console.error(`Error processing early collaboration message from ${socketId}:`, err.message);
      }
    }

    // 6. Handle socket close / disconnect
    ws.on("close", () => {
      this._handleDisconnect(socketId, projectId, user);
    });

    ws.on("error", (err) => {
      console.warn(`Collaboration socket error for ${socketId}:`, err.message);
      this._handleDisconnect(socketId, projectId, user);
    });
  }

  /**
   * Message dispatcher for client collaboration events
   */
  async _handleMessage(socketId, projectId, user, ws, msg) {
    switch (msg.type) {
      case "ping":
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        break;

      case "presence_update": {
        // e.g. { currentFileId, currentFileName, cursor, selection, status }
        const updated = presenceService.updatePresence(projectId, socketId, msg.data || {});
        if (updated) {
          this.broadcastToRoom(
            projectId,
            {
              type: "presence_updated",
              socketId,
              userId: user._id.toString(),
              data: {
                currentFileId: updated.currentFileId,
                currentFileName: updated.currentFileName,
                cursor: updated.cursor,
                selection: updated.selection,
                status: updated.status,
              },
            },
            ws
          );

          if (msg.data?.currentFileId && msg.data?.currentFileName) {
            collaborationActivityService.recordFileOpen(
              projectId,
              msg.data.currentFileId,
              msg.data.currentFileName,
              user,
              updated.color
            );
          }
        }
        break;
      }

      case "document_subscribe": {
        const { fileId } = msg;
        if (!fileId) return;

        const subscribed = await collaborationService.subscribe(projectId, fileId, ws);
        if (!subscribed) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "File not found or unauthorized",
              fileId,
            })
          );
          return;
        }

        // Request document sync step 1 from client
        ws.send(
          JSON.stringify({
            type: "document_sync_ready",
            fileId,
          })
        );
        break;
      }

      case "document_unsubscribe": {
        const { fileId } = msg;
        if (fileId) {
          collaborationService.unsubscribe(projectId, fileId, ws);
        }
        break;
      }

      case "document_sync_step_1": {
        // Client sends its state vector -> Server computes missing updates (Sync Step 2)
        const { fileId, stateVector } = msg;
        if (!fileId || !stateVector) return;

        const clientVector = Buffer.from(stateVector, "base64");
        const result = await collaborationService.handleSyncStep1(
          projectId,
          fileId,
          clientVector
        );
        if (!result) return;
        const { syncStep2Update, serverStateVector } = result;

        // Send Sync Step 2 update to the client
        ws.send(
          JSON.stringify({
            type: "document_sync_step_2",
            fileId,
            update: Buffer.from(syncStep2Update).toString("base64"),
          })
        );

        // Also ask client to send what server is missing
        ws.send(
          JSON.stringify({
            type: "document_sync_step_1_ack",
            fileId,
            serverStateVector: Buffer.from(serverStateVector).toString("base64"),
          })
        );
        break;
      }

      case "document_sync_step_2": {
        // Client sends missing updates to server
        const { fileId, update } = msg;
        if (!fileId || !update) return;

        const updateBytes = Buffer.from(update, "base64");
        const subscribers = await collaborationService.handleSyncStep2(
          projectId,
          fileId,
          updateBytes,
          ws
        );
        if (!subscribers) return;

        // Broadcast missing updates to other peers
        this._broadcastToSubscribers(
          subscribers,
          {
            type: "document_update",
            fileId,
            update,
            senderSocketId: socketId,
          },
          ws
        );
        break;
      }

      case "document_update": {
        // Incremental CRDT update from client typing
        const { fileId, update } = msg;
        if (!fileId || !update) return;

        const updateBytes = Buffer.from(update, "base64");
        const result = await collaborationService.applyClientUpdate(
          projectId,
          fileId,
          updateBytes,
          ws
        );
        if (!result) return;
        const { subscribers, fileName } = result;

        // Broadcast incremental update to all other subscribers of this file
        this._broadcastToSubscribers(
          subscribers,
          {
            type: "document_update",
            fileId,
            update,
            senderSocketId: socketId,
          },
          ws
        );

        // Record debounced file_edited activity
        const userPresence = presenceService.findUserBySocketId(socketId)?.presence;
        collaborationActivityService.recordDocumentEdit(
          projectId,
          fileId,
          fileName,
          user,
          userPresence?.color || "#3b82f6"
        );
        break;
      }

      case "leave_workspace": {
        this._handleDisconnect(socketId, projectId, user, true /* immediate */);
        break;
      }

      case "awareness_update": {
        // Yjs awareness update (cursors, selections)
        const { fileId, update } = msg;
        if (!fileId || !update) return;

        const entry = await collaborationService.getOrCreateDoc(projectId, fileId);
        if (!entry) return;
        this._broadcastToSubscribers(
          entry.subscribers,
          {
            type: "awareness_update",
            fileId,
            update,
            senderSocketId: socketId,
          },
          ws
        );
        break;
      }

      case "save_document": {
        const { fileId } = msg;
        if (fileId) {
          await collaborationService.saveDocument(projectId, fileId);
          ws.send(
            JSON.stringify({
              type: "document_saved",
              fileId,
            })
          );
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Handle client disconnect
   */
  _handleDisconnect(socketId, projectId, user, immediate = false) {
    if (!this.socketMap.has(socketId)) return;

    const { ws } = this.socketMap.get(socketId);
    this.socketMap.delete(socketId);

    // Unsubscribe from any files
    collaborationService.unsubscribeSocketFromAll(ws);

    // Remove from presence (delays 1200ms if not immediate to absorb reloads/reconnects)
    const leaveResult = presenceService.leaveRoom(projectId, socketId, immediate);
    if (leaveResult && leaveResult.isFinalDeparture) {
      this.broadcastToRoom(projectId, {
        type: "user_left",
        socketId,
        userId: user._id.toString(),
        name: user.name,
        userName: user.name,
      });

      collaborationActivityService.recordLeave(
        projectId,
        user,
        leaveResult.leftPresence?.color || "#3b82f6"
      );
    }
  }

  /**
   * Broadcast message to a set of subscriber WebSockets
   */
  _broadcastToSubscribers(subscribers, message, excludeWs = null) {
    const payload = JSON.stringify(message);
    for (const client of subscribers) {
      if (client !== excludeWs && client.readyState === 1) {
        client.send(payload);
      }
    }
  }

  /**
   * Broadcast an event message to all connected clients in a project room
   * @param {string} projectId
   * @param {object} message
   * @param {WebSocket|null} excludeWs
   */
  broadcastToRoom(projectId, message, excludeWs = null) {
    const sockets = presenceService.getRoomSockets(projectId);
    const payload = JSON.stringify(message);

    for (const { ws } of sockets) {
      if (ws !== excludeWs && ws.readyState === 1) {
        ws.send(payload);
      }
    }
  }
}

export const collaborationGateway = new CollaborationGateway();
export default collaborationGateway;
