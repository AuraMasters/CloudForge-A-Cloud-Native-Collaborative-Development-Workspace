export type ConnectionStatus = "connected" | "reconnecting" | "offline";

export interface CollaboratorCursor {
  line: number;
  col: number;
}

export interface CollaboratorSelection {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

export interface Collaborator {
  socketId: string;
  userId: string;
  name: string;
  email: string;
  color: string;
  currentFileId: string | null;
  currentFileName: string | null;
  cursor: CollaboratorCursor | null;
  selection: CollaboratorSelection | null;
  status: "active" | "idle";
  joinedAt: number;
  lastActive?: number;
}

export type ActivityType =
  | "user_joined"
  | "user_left"
  | "file_opened"
  | "file_edited"
  | "file_created"
  | "file_renamed"
  | "file_deleted"
  | "commit_created"
  | "branch_changed";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  userId?: string;
  userName: string;
  userColor?: string;
  message: string;
  timestamp: number;
  details?: Record<string, any>;
}

export type CollaborationActivity = ActivityItem;

export interface CollabMessage {
  type: string;
  projectId?: string;
  fileId?: string;
  socketId?: string;
  userId?: string;
  userName?: string;
  user?: any;
  collaborator?: any;
  collaborators?: any[];
  activity?: ActivityItem;
  activities?: ActivityItem[];
  data?: any;
  update?: string; // base64
  stateVector?: string; // base64
  serverStateVector?: string; // base64
  file?: any;
  commit?: any;
  branch?: string;
  currentBranch?: string;
  branches?: string[];
  newName?: string;
  newPath?: string;
  oldPath?: string;
  filePath?: string;
  isDirectory?: boolean;
  message?: string;
  timestamp?: number;
}
