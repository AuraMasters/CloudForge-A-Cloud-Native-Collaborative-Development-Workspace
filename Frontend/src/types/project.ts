export interface GitHubProjectSource {
  repositoryId: string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  cloneUrl: string;
}

export interface ProjectSource {
  type: "blank" | "github";
  github?: GitHubProjectSource;
}

export interface GitRemote {
  connected: boolean;
  owner?: string;
  repo?: string;
  fullName?: string;
  url?: string;
  cloneUrl?: string;
  defaultBranch?: string;
  lastSyncedAt?: string;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  template?: string;
  owner: string;
  source: ProjectSource;
  currentBranch?: string;
  branches?: string[];
  gitRemote?: GitRemote;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description: string;
  template?: string;
}