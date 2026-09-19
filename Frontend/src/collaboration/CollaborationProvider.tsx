import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { CollaborationClient } from "./collaborationClient";
import { DocumentSyncManager } from "./documentSync";
import {
  type Collaborator,
  type ConnectionStatus,
  type ActivityItem,
  type CollabMessage,
} from "./types";
import { useAuth } from "../context/AuthContent";

interface CollaborationContextType {
  status: ConnectionStatus;
  collaborators: Collaborator[];
  activeCount: number;
  currentUserColor: string;
  activities: ActivityItem[];
  client: CollaborationClient | null;
  updateActiveFile: (fileId: string | null, fileName: string | null) => void;
  attachEditor: (
    fileId: string,
    editor: any,
    initialContent?: string
  ) => { destroy: () => void } | null;
  detachEditor: (fileId: string) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

interface CollaborationProviderProps {
  projectId: string;
  children: ReactNode;
  onRemoteFileCreated?: (file: any) => void;
  onRemoteFileRenamed?: (data: { fileId: string; newName: string; newPath: string; oldPath: string }) => void;
  onRemoteFileDeleted?: (data: { fileId: string; filePath: string }) => void;
  onRemoteCommitCreated?: (commit: any) => void;
  onRemoteBranchChanged?: (data: { currentBranch: string; branches: string[] }) => void;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({
  projectId,
  children,
  onRemoteFileCreated,
  onRemoteFileRenamed,
  onRemoteFileDeleted,
  onRemoteCommitCreated,
  onRemoteBranchChanged,
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentUserColor, setCurrentUserColor] = useState<string>("#3b82f6");

  const clientRef = useRef<CollaborationClient | null>(null);
  const docSyncRef = useRef<DocumentSyncManager | null>(null);

  const dedupeCollaborators = useCallback((list: Collaborator[], selfId?: string): Collaborator[] => {
    const seen = new Set<string>();
    const result: Collaborator[] = [];
    for (const c of list) {
      const uid = c.userId || (c as any).id;
      if (!uid) continue;
      if (selfId && uid === selfId) continue;
      if (!seen.has(uid)) {
        seen.add(uid);
        result.push(c);
      }
    }
    return result;
  }, []);

  const addActivity = useCallback((activity: Omit<ActivityItem, "id" | "timestamp"> & { id?: string; timestamp?: number }) => {
    const item: ActivityItem = {
      ...activity,
      id: activity.id || `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: activity.timestamp || Date.now(),
    };
    setActivities((prev) => {
      if (prev.some((a) => a.id === item.id)) return prev;
      return [item, ...prev.slice(0, 99)];
    });
  }, []);

  // Initialize CollaborationClient and DocumentSyncManager
  useEffect(() => {
    if (!projectId) return;

    const client = new CollaborationClient(projectId);
    clientRef.current = client;

    const docSync = new DocumentSyncManager(client, {
      id: (user as any)?._id || (user as any)?.id || "anonymous",
      name: user?.name || "Collaborator",
      color: "#3b82f6",
    });
    docSyncRef.current = docSync;

    const unsubscribeStatus = client.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    const unsubscribeMsg = client.onMessage((msg: CollabMessage) => {
      switch (msg.type) {
        case "connected": {
          if (msg.user?.color) {
            setCurrentUserColor(msg.user.color);
            docSync.updateCurrentUser({
              id: msg.user.id,
              name: msg.user.name,
              color: msg.user.color,
            });
          }
          const currentUid = (user as any)?._id || (user as any)?.id || msg.user?.id;
          if (Array.isArray(msg.collaborators)) {
            setCollaborators(dedupeCollaborators(msg.collaborators, currentUid));
          }
          if (Array.isArray(msg.activities)) {
            setActivities(msg.activities);
          }
          break;
        }

        case "activity_event": {
          if (msg.activity && msg.activity.id) {
            const act = msg.activity;
            setActivities((prev) => {
              if (prev.some((a) => a.id === act.id)) return prev;
              return [act, ...prev.slice(0, 99)];
            });
          }
          break;
        }

        case "user_joined": {
          if (msg.collaborator) {
            const currentUid = (user as any)?._id || (user as any)?.id;
            const targetUid = msg.collaborator.userId;
            // Ignore self join notifications (e.g. from additional tab)
            if (currentUid && targetUid === currentUid) {
              break;
            }
            setCollaborators((prev) => {
              const withoutUser = prev.filter((c) => (c.userId || (c as any).id) !== targetUid);
              return [...withoutUser, msg.collaborator];
            });
          }
          break;
        }

        case "user_left": {
          const leftUserId = msg.userId;
          if (leftUserId) {
            setCollaborators((prev) => prev.filter((c) => (c.userId || (c as any).id) !== leftUserId));
          } else if (msg.socketId) {
            setCollaborators((prev) => prev.filter((c) => c.socketId !== msg.socketId));
          }
          break;
        }

        case "presence_updated": {
          if (msg.data) {
            setCollaborators((prev) =>
              prev.map((c) => {
                const isMatch =
                  (msg.userId && (c.userId === msg.userId || (c as any).id === msg.userId)) ||
                  (msg.socketId && c.socketId === msg.socketId);
                if (isMatch) {
                  return {
                    ...c,
                    currentFileId: msg.data.currentFileId !== undefined ? msg.data.currentFileId : c.currentFileId,
                    currentFileName: msg.data.currentFileName !== undefined ? msg.data.currentFileName : c.currentFileName,
                    cursor: msg.data.cursor !== undefined ? msg.data.cursor : c.cursor,
                    selection: msg.data.selection !== undefined ? msg.data.selection : c.selection,
                    status: msg.data.status !== undefined ? msg.data.status : c.status,
                  };
                }
                return c;
              })
            );
          }
          break;
        }

        case "file_created": {
          if (msg.file) {
            onRemoteFileCreated?.(msg.file);
          }
          break;
        }

        case "file_renamed": {
          if (msg.fileId && msg.newName) {
            onRemoteFileRenamed?.({
              fileId: msg.fileId,
              newName: msg.newName,
              newPath: msg.newPath || "",
              oldPath: msg.oldPath || "",
            });
          }
          break;
        }

        case "file_deleted": {
          if (msg.fileId) {
            onRemoteFileDeleted?.({
              fileId: msg.fileId,
              filePath: msg.filePath || "",
            });
          }
          break;
        }

        case "commit_created": {
          if (msg.commit) {
            onRemoteCommitCreated?.(msg.commit);
          }
          break;
        }

        case "branch_changed": {
          if (msg.currentBranch && msg.branches) {
            onRemoteBranchChanged?.({
              currentBranch: msg.currentBranch,
              branches: msg.branches,
            });
          }
          break;
        }

        default:
          break;
      }
    });

    client.connect();

    return () => {
      unsubscribeStatus();
      unsubscribeMsg();
      docSync.destroy();
      client.disconnect();
    };
  }, [
    projectId,
    user,
    addActivity,
    onRemoteFileCreated,
    onRemoteFileRenamed,
    onRemoteFileDeleted,
    onRemoteCommitCreated,
    onRemoteBranchChanged,
  ]);

  const updateActiveFile = useCallback((fileId: string | null, fileName: string | null) => {
    if (!clientRef.current) return;
    clientRef.current.send({
      type: "presence_update",
      data: {
        currentFileId: fileId,
        currentFileName: fileName,
      },
    });
  }, []);

  const attachEditor = useCallback(
    (fileId: string, editor: any, initialContent: string = "") => {
      if (!docSyncRef.current) return null;
      return docSyncRef.current.attachEditor(fileId, editor, initialContent);
    },
    []
  );

  const detachEditor = useCallback((fileId: string) => {
    if (docSyncRef.current) {
      docSyncRef.current.detachEditor(fileId);
    }
  }, []);

  return (
    <CollaborationContext.Provider
      value={{
        status,
        collaborators,
        activeCount: collaborators.length + (status === "connected" ? 1 : 0),
        currentUserColor,
        activities,
        client: clientRef.current,
        updateActiveFile,
        attachEditor,
        detachEditor,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
};

export const useCollaboration = (): CollaborationContextType | null => {
  return useContext(CollaborationContext);
};
