export interface Project {
  _id: string;
  name: string;
  description: string;
  language: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description: string;
  language: string;
}