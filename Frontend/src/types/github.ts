export interface GitHubRepository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  private: boolean;
  owner: string;
  defaultBranch: string;
  url: string;
  cloneUrl: string;
  alreadyImported: boolean;
  projectId: string | null;
}

export interface GitHubRepositoriesResponse {
  repositories: GitHubRepository[];
}