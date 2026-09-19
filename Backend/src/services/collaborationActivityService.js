import crypto from "crypto";

/**
 * CollaborationActivityService
 * Manages authoritative server-side real-time collaboration activity feed.
 * Ensures consistent server timestamps, event IDs, and debounced/throttled activity events.
 *
 * Supported event types:
 * - user_joined
 * - user_left
 * - file_opened
 * - file_edited (debounced per user/file)
 * - file_created
 * - file_renamed
 * - file_deleted
 * - commit_created
 * - branch_changed
 */

class CollaborationActivityService {
  constructor() {
    // Map of projectId -> Array<ActivityItem> (ring buffer of latest 100)
    this.projectActivities = new Map();

    // Throttle tracking
    // Map of `${projectId}:${userId}:${fileId}` -> timestamp
    this.editThrottle = new Map();
    // Map of `${projectId}:${userId}:${fileId}` -> timestamp
    this.openThrottle = new Map();
    // Map of `${projectId}:${userId}` -> timestamp
    this.joinThrottle = new Map();

    // Broadcast delegate
    this.broadcaster = null;
  }

  setBroadcaster(fn) {
    this.broadcaster = fn;
  }

  /**
   * Get recent activities for a project, sorted newest first
   */
  getRecentActivities(projectId, limit = 50) {
    const projId = projectId.toString();
    const list = this.projectActivities.get(projId) || [];
    return list.slice(0, limit);
  }

  /**
   * Record and broadcast a generic activity event
   */
  recordActivity(projectId, data, excludeWs = null) {
    const projId = projectId.toString();
    if (!this.projectActivities.has(projId)) {
      this.projectActivities.set(projId, []);
    }

    const name = data.userName || "Collaborator";
    let defaultMsg = `${name} performed an action`;
    if (data.type === "file_created") defaultMsg = `${name} created ${data.fileName || "a file"}`;
    else if (data.type === "file_renamed") defaultMsg = `${name} renamed ${data.fileName || "a file"}`;
    else if (data.type === "file_deleted") defaultMsg = `${name} deleted ${data.fileName || "a file"}`;
    else if (data.type === "commit_created") defaultMsg = `${name} committed: "${data.metadata?.message || ""}"`;
    else if (data.type === "branch_changed") defaultMsg = `${name} switched branch to "${data.metadata?.branch || ""}"`;

    const activity = {
      id: `act_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      type: data.type,
      userId: data.userId ? data.userId.toString() : null,
      userName: name,
      userColor: data.userColor || "#3b82f6",
      projectId: projId,
      fileId: data.fileId ? data.fileId.toString() : undefined,
      fileName: data.fileName || undefined,
      message: data.message || defaultMsg,
      metadata: {
        ...(data.metadata || {}),
        fileName: data.fileName || (data.metadata && data.metadata.fileName),
        fileId: data.fileId || (data.metadata && data.metadata.fileId),
      },
      timestamp: Date.now(),
    };

    const list = this.projectActivities.get(projId);
    // Add to front of history
    list.unshift(activity);
    if (list.length > 100) {
      list.pop();
    }

    // Broadcast activity event to the room
    if (this.broadcaster) {
      this.broadcaster(
        projId,
        {
          type: "activity_event",
          activity,
        },
        excludeWs
      );
    }

    return activity;
  }

  /**
   * Record a document edit event with debouncing (max once every 4 seconds per user & file)
   */
  recordDocumentEdit(projectId, fileId, fileName, user, userColor, excludeWs = null) {
    const projId = projectId.toString();
    const userId = (user._id || user.id).toString();
    const fId = fileId.toString();
    const throttleKey = `${projId}:${userId}:${fId}`;

    const now = Date.now();
    const lastTime = this.editThrottle.get(throttleKey) || 0;

    // 4-second debounce per user per file
    if (now - lastTime < 4000) {
      return null;
    }

    this.editThrottle.set(throttleKey, now);

    const displayName = user.name || "Collaborator";
    const name = fileName || "a file";

    return this.recordActivity(
      projId,
      {
        type: "file_edited",
        userId,
        userName: displayName,
        userColor,
        fileId: fId,
        fileName: name,
        message: `${displayName} edited ${name}`,
      },
      excludeWs
    );
  }

  /**
   * Record a file opened event with throttling (max once every 8 seconds per user & file)
   */
  recordFileOpen(projectId, fileId, fileName, user, userColor, excludeWs = null) {
    if (!fileId || !fileName) return null;

    const projId = projectId.toString();
    const userId = (user._id || user.id).toString();
    const fId = fileId.toString();
    const throttleKey = `${projId}:${userId}:${fId}`;

    const now = Date.now();
    const lastTime = this.openThrottle.get(throttleKey) || 0;

    // 8-second debounce per user per file
    if (now - lastTime < 8000) {
      return null;
    }

    this.openThrottle.set(throttleKey, now);

    const displayName = user.name || "Collaborator";

    return this.recordActivity(
      projId,
      {
        type: "file_opened",
        userId,
        userName: displayName,
        userColor,
        fileId: fId,
        fileName,
        message: `${displayName} opened ${fileName}`,
      },
      excludeWs
    );
  }

  /**
   * Record user joined event
   */
  recordJoin(projectId, user, userColor) {
    const projId = projectId.toString();
    const userId = (user._id || user.id).toString();
    const throttleKey = `${projId}:${userId}`;

    const now = Date.now();
    const lastTime = this.joinThrottle.get(throttleKey) || 0;

    // Avoid duplicate join announcements within 3 seconds
    if (now - lastTime < 3000) {
      return null;
    }
    this.joinThrottle.set(throttleKey, now);

    const displayName = user.name || "Collaborator";

    return this.recordActivity(projId, {
      type: "user_joined",
      userId,
      userName: displayName,
      userColor,
      message: `${displayName} joined the workspace`,
    });
  }

  /**
   * Record user left event
   */
  recordLeave(projectId, user, userColor) {
    const projId = projectId.toString();
    const userId = (user._id || user.id).toString();
    const displayName = user.name || "Collaborator";

    // Clear join throttle so a future join will announce
    this.joinThrottle.delete(`${projId}:${userId}`);

    return this.recordActivity(projId, {
      type: "user_left",
      userId,
      userName: displayName,
      userColor,
      message: `${displayName} left the workspace`,
    });
  }
}

export const collaborationActivityService = new CollaborationActivityService();
export default collaborationActivityService;
