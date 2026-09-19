import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import { type CollaborationClient } from "./collaborationClient";
import { type CollabMessage } from "./types";

interface ActiveSession {
  fileId: string;
  doc: Y.Doc;
  awareness: Awareness;
  binding: MonacoBinding | null;
  fallbackTimer?: any;
  unsubscribeMsg: () => void;
  cleanupCss: () => void;
}

// Convert Uint8Array to base64
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to Uint8Array
function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * DocumentSyncManager
 * Coordinates in-memory Yjs CRDT documents, awareness (cursors/selections),
 * and Monaco editor bindings with the real-time WebSocket transport.
 */
export class DocumentSyncManager {
  private client: CollaborationClient;
  private sessions: Map<string, ActiveSession> = new Map();
  private currentUser: { id: string; name: string; color: string };

  constructor(client: CollaborationClient, currentUser: { id: string; name: string; color: string }) {
    this.client = client;
    this.currentUser = currentUser;
  }

  public updateCurrentUser(user: { id: string; name: string; color: string }) {
    this.currentUser = user;
    for (const session of this.sessions.values()) {
      session.awareness.setLocalStateField("user", {
        name: user.name,
        color: user.color,
      });
    }
  }

  /**
   * Bind an active Monaco Editor instance to a file's Yjs CRDT document
   */
  public attachEditor(
    fileId: string,
    editor: any,
    initialContent: string = ""
  ): { destroy: () => void } {
    // 1. Clean up existing session for this file if any
    this.detachEditor(fileId);

    const doc = new Y.Doc({ gc: true });
    const ytext = doc.getText("monaco");

    const awareness = new Awareness(doc);
    awareness.setLocalStateField("user", {
      name: this.currentUser.name || "Collaborator",
      color: this.currentUser.color || "#3b82f6",
    });

    const model = editor.getModel();

    // 2. Prepare session object
    const session: ActiveSession = {
      fileId,
      doc,
      awareness,
      binding: null,
      fallbackTimer: null,
      unsubscribeMsg: () => {},
      cleanupCss: () => {},
    };

    const initBinding = () => {
      if (session.binding) return;
      try {
        session.binding = new MonacoBinding(ytext, model, new Set([editor]), awareness);
      } catch (err) {
        console.warn("MonacoBinding initialization warning:", err);
      }
    };

    // 3. Fallback timer in case WebSocket is offline or standalone: seed initialContent and bind
    const fallbackDelay = this.client.isConnected() ? 5000 : 200;
    session.fallbackTimer = setTimeout(() => {
      if (!session.binding) {
        if (ytext.length === 0 && initialContent) {
          ytext.insert(0, initialContent);
        }
        initBinding();
      }
    }, fallbackDelay);

    // 4. Inject CSS for remote cursor flags
    const cleanupCss = this._injectCursorStyles();
    session.cleanupCss = cleanupCss;

    // 5. Handle local document edits -> send incremental update to backend
    const onDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin === "remote") return;
      this.client.send({
        type: "document_update",
        fileId,
        update: toBase64(update),
      });
    };
    doc.on("update", onDocUpdate);

    // 6. Handle awareness updates (cursors/selections)
    const onAwarenessUpdate = (_changes: any, origin: any) => {
      if (origin === "remote") return;
      const localState = awareness.getLocalState();
      if (localState) {
        this.client.send({
          type: "presence_update",
          data: {
            cursor: localState.cursor || null,
            selection: localState.selection || null,
          },
        });
      }
    };
    awareness.on("update", onAwarenessUpdate);

    // 7. Listen for incoming WebSocket messages for this document
    const unsubscribeMsg = this.client.onMessage((msg: CollabMessage) => {
      if (msg.fileId !== fileId) return;

      switch (msg.type) {
        case "document_sync_ready": {
          // Send Sync Step 1 to server (state vector)
          const stateVector = Y.encodeStateVector(doc);
          this.client.send({
            type: "document_sync_step_1",
            fileId,
            stateVector: toBase64(stateVector),
          });
          break;
        }

        case "document_sync_step_2": {
          // Clear fallback timer and apply canonical server updates
          if (session.fallbackTimer) {
            clearTimeout(session.fallbackTimer);
            session.fallbackTimer = null;
          }
          if (msg.update) {
            const updateBytes = fromBase64(msg.update);
            Y.applyUpdate(doc, updateBytes, "remote");
          }
          if (ytext.length === 0 && initialContent) {
            ytext.insert(0, initialContent);
          }
          initBinding();
          break;
        }

        case "document_sync_step_1_ack": {
          // Server sent its state vector; client computes what server is missing
          if (msg.serverStateVector) {
            const serverVector = fromBase64(msg.serverStateVector);
            const missingUpdate = Y.encodeStateAsUpdate(doc, serverVector);
            if (missingUpdate.length > 0) {
              this.client.send({
                type: "document_sync_step_2",
                fileId,
                update: toBase64(missingUpdate),
              });
            }
          }
          break;
        }

        case "document_update": {
          // Incremental edit from another peer
          if (msg.update) {
            const updateBytes = fromBase64(msg.update);
            Y.applyUpdate(doc, updateBytes, "remote");
          }
          break;
        }

        default:
          break;
      }
    });
    session.unsubscribeMsg = unsubscribeMsg;

    // 8. Subscribe to document updates on the backend
    this.client.send({
      type: "document_subscribe",
      fileId,
    });

    this.sessions.set(fileId, session);

    return {
      destroy: () => this.detachEditor(fileId),
    };
  }

  /**
   * Detach and clean up Monaco binding and subscriptions for a file
   */
  public detachEditor(fileId: string): void {
    if (!this.sessions.has(fileId)) return;

    const session = this.sessions.get(fileId)!;

    if (session.fallbackTimer) {
      clearTimeout(session.fallbackTimer);
      session.fallbackTimer = null;
    }

    this.client.send({
      type: "document_unsubscribe",
      fileId,
    });

    session.unsubscribeMsg();
    session.cleanupCss();

    if (session.binding) {
      try {
        session.binding.destroy();
      } catch {
        // ignore
      }
    }

    session.awareness.destroy();
    session.doc.destroy();

    this.sessions.delete(fileId);
  }

  /**
   * Inject dynamic CSS styles for Monaco remote cursors and selection flags
   */
  private _injectCursorStyles(): () => void {
    const styleId = "cf-monaco-collab-cursors";
    if (document.getElementById(styleId)) {
      return () => {};
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .yRemoteSelection {
        background-color: rgba(59, 130, 246, 0.25);
        border-radius: 2px;
      }
      .yRemoteSelectionHead {
        position: absolute;
        border-left: 2px solid #3b82f6;
        border-top: 2px solid #3b82f6;
        border-bottom: 2px solid #3b82f6;
        height: 100%;
        box-sizing: border-box;
      }
      .yRemoteSelectionHead::after {
        position: absolute;
        content: ' ';
        border: 3px solid #3b82f6;
        left: -4px;
        top: -5px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Keep persistent style or cleanup if no sessions remain
      if (this.sessions.size === 0) {
        const el = document.getElementById(styleId);
        if (el) el.remove();
      }
    };
  }

  public destroy(): void {
    for (const fileId of Array.from(this.sessions.keys())) {
      this.detachEditor(fileId);
    }
  }
}
