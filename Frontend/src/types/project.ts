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

export interface Project {
  _id: string;
  name: string;
  description: string;
  language: string;
  owner: string;
  source: ProjectSource;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description: string;
  language: string;
}