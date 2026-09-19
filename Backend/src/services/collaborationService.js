import * as Y from "yjs";
import mongoose from "mongoose";
import ProjectFile from "../models/ProjectFile.js";
import containerService from "./containerService.js";

/**
 * CollaborationService
 * Manages in-memory CRDT (Yjs) documents per project file.
 * Handles incremental updates, synchronization handshakes, and periodic/on-demand
 * persistence to MongoDB without writing on every keystroke.
 */
class CollaborationService {
  constructor() {
    // Map of `${projectId}:${fileId}` -> { doc, projectId, fileId, subscribers: Set<ws>, isDirty: boolean, lastActive: number }
    this.docs = new Map();
    this.loadingDocs = new Map();

    // Auto-save debounced flush interval (every 8 seconds)
    this.flushInterval = setInterval(() => {
      this.flushDirtyDocuments();
    }, 8000);
  }

  _getKey(projectId, fileId) {
    return `${String(projectId).trim()}:${String(fileId).trim()}`;
  }

  /**
   * Get an existing in-memory Y.Doc or initialize it from MongoDB.
   * Returns null if file does not exist, belongs to another project, or has invalid IDs.
   */
  async getOrCreateDoc(projectId, fileId) {
    if (!projectId || !fileId) return null;
    const pId = String(projectId).trim();
    const fId = String(fileId).trim();

    if (!mongoose.Types.ObjectId.isValid(pId) || !mongoose.Types.ObjectId.isValid(fId)) {
      return null;
    }

    const key = this._getKey(pId, fId);

    if (this.docs.has(key)) {
      const entry = this.docs.get(key);
      entry.lastActive = Date.now();
      return entry;
    }

    if (this.loadingDocs.has(key)) {
      return await this.loadingDocs.get(key);
    }

    const loadPromise = (async () => {
      try {
        if (this.docs.has(key)) {
          return this.docs.get(key);
        }

        // Verify the file exists and belongs to this project
        const file = await ProjectFile.findOne({ _id: fId, projectId: pId }).select("content type path name");
        if (!file || file.type === "directory") {
          return null;
        }

        // Initialize a new Y.Doc
        const doc = new Y.Doc({ gc: true });
        const ytext = doc.getText("monaco");

        if (typeof file.content === "string" && file.content.length > 0) {
          ytext.insert(0, file.content);
        }

        const entry = {
          doc,
          projectId: pId,
          fileId: fId,
          fileName: file.name || (file.path ? file.path.split("/").pop() : "file"),
          subscribers: new Set(),
          isDirty: false,
          lastActive: Date.now(),
        };

        // Mark as dirty when updates occur
        doc.on("update", () => {
          entry.isDirty = true;
          entry.lastActive = Date.now();
        });

        this.docs.set(key, entry);
        return entry;
      } catch (err) {
        console.error(`Failed to load initial file content for ${key}:`, err.message);
        return null;
      } finally {
        this.loadingDocs.delete(key);
      }
    })();

    this.loadingDocs.set(key, loadPromise);
    return await loadPromise;
  }

  /**
   * Subscribe a client socket to document updates
   */
  async subscribe(projectId, fileId, ws) {
    const entry = await this.getOrCreateDoc(projectId, fileId);
    if (!entry) return null;
    entry.subscribers.add(ws);
    return entry;
  }

  /**
   * Unsubscribe a client socket
   */
  unsubscribe(projectId, fileId, ws) {
    const key = this._getKey(projectId, fileId);
    if (!this.docs.has(key)) return;

    const entry = this.docs.get(key);
    entry.subscribers.delete(ws);

    // If no more subscribers, persist immediately
    if (entry.subscribers.size === 0) {
      if (entry.isDirty) {
        this.saveDocument(projectId, fileId).catch(console.error);
      }
    }
  }

  /**
   * Unsubscribe a socket from all documents it is subscribed to
   */
  unsubscribeSocketFromAll(ws) {
    for (const entry of this.docs.values()) {
      if (entry.subscribers.has(ws)) {
        entry.subscribers.delete(ws);
        if (entry.subscribers.size === 0 && entry.isDirty) {
          this.saveDocument(entry.projectId, entry.fileId).catch(console.error);
        }
      }
    }
  }

  /**
   * Remove a document from memory (e.g. on file deletion)
   */
  removeDocument(projectId, fileId) {
    const key = this._getKey(projectId, fileId);
    if (this.docs.has(key)) {
      const entry = this.docs.get(key);
      entry.subscribers.clear();
      entry.doc.destroy();
      this.docs.delete(key);
    }
  }

  /**
   * Apply an incremental binary update from a client
   * @param {string} projectId
   * @param {string} fileId
   * @param {Uint8Array} updateBytes
   * @param {WebSocket} originWs
   * @returns {Promise<Set<WebSocket>|null>} Set of other peer sockets to forward update to
   */
  async applyClientUpdate(projectId, fileId, updateBytes, originWs) {
    const entry = await this.getOrCreateDoc(projectId, fileId);
    if (!entry) return null;
    Y.applyUpdate(entry.doc, updateBytes, originWs);
    entry.lastActive = Date.now();
    return {
      subscribers: entry.subscribers,
      fileName: entry.fileName,
    };
  }

  /**
   * Handle Yjs Sync Step 1:
   * Client sends state vector -> Server computes missing update (Sync Step 2)
   * @param {string} projectId
   * @param {string} fileId
   * @param {Uint8Array} clientStateVector
   * @returns {Promise<{ syncStep2Update: Uint8Array, serverStateVector: Uint8Array }|null>}
   */
  async handleSyncStep1(projectId, fileId, clientStateVector) {
    const entry = await this.getOrCreateDoc(projectId, fileId);
    if (!entry) return null;
    const syncStep2Update = Y.encodeStateAsUpdate(entry.doc, clientStateVector);
    const serverStateVector = Y.encodeStateVector(entry.doc);
    return { syncStep2Update, serverStateVector };
  }

  /**
   * Handle Yjs Sync Step 2:
   * Client sends missing update to server
   */
  async handleSyncStep2(projectId, fileId, updateBytes, originWs) {
    const entry = await this.getOrCreateDoc(projectId, fileId);
    if (!entry) return null;
    Y.applyUpdate(entry.doc, updateBytes, originWs);
    return entry.subscribers;
  }

  /**
   * Get the current plain-text representation of a document
   */
  async getDocumentContent(projectId, fileId) {
    const entry = await this.getOrCreateDoc(projectId, fileId);
    if (!entry) return null;
    return entry.doc.getText("monaco").toString();
  }

  /**
   * Persist in-memory Y.Doc content back to MongoDB ProjectFile and disk workspace
   */
  async saveDocument(projectId, fileId) {
    const key = this._getKey(projectId, fileId);
    if (!this.docs.has(key)) return;

    const entry = this.docs.get(key);
    if (!entry.isDirty) return;

    const content = entry.doc.getText("monaco").toString();
    // Mark clean BEFORE awaiting I/O to avoid clobbering new incoming keystrokes
    entry.isDirty = false;

    try {
      const updatedFile = await ProjectFile.findOneAndUpdate(
        { _id: fileId, projectId },
        {
          content,
          size: Buffer.byteLength(content, "utf8"),
        },
        { new: true }
      );
      if (updatedFile) {
        containerService.syncSingleFile(projectId, updatedFile.path, content).catch(() => {});
      }
    } catch (err) {
      // Restore dirty flag on failure so subsequent flushes retry
      entry.isDirty = true;
      console.error(`Failed to save document ${key} to MongoDB:`, err.message);
    }
  }

  /**
   * Flush all dirty in-memory documents to MongoDB
   */
  async flushDirtyDocuments() {
    const saves = [];
    for (const entry of this.docs.values()) {
      if (entry.isDirty) {
        saves.push(this.saveDocument(entry.projectId, entry.fileId));
      }
    }
    if (saves.length > 0) {
      await Promise.allSettled(saves);
    }
  }

  /**
   * Clean up resources on server shutdown
   */
  async destroy() {
    clearInterval(this.flushInterval);
    await this.flushDirtyDocuments();
    this.docs.clear();
  }
}

export const collaborationService = new CollaborationService();
export default collaborationService;
