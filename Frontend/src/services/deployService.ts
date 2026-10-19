import API_URL, { getAuthHeaders } from "../config/api";

export interface DeploymentLog {
  timestamp: string;
  stream: "stdout" | "stderr" | "system";
  message: string;
}

export interface DeploymentRecord {
  _id: string;
  deployId: string;
  projectId: string;
  status: "queued" | "building" | "ready" | "failed" | "stopped";
  target: "static" | "node" | "python" | "docker";
  framework: {
    id: string;
    name: string;
    icon: string;
  };
  buildCommand: string;
  outputDir: string;
  runtime: string;
  branch: string;
  commitSha?: string;
  siteUrl: string;
  isCurrent: boolean;
  logs?: DeploymentLog[];
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const deployService = {
  /**
   * Start a new deployment
   */
  async startDeployment(
    projectId: string,
    options: {
      target?: string;
      buildCommand?: string;
      outputDir?: string;
      envOverrides?: Record<string, string>;
    } = {}
  ): Promise<{ success: boolean; deployment: DeploymentRecord; message: string }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/deploy`, {
      method: "POST",
      headers: getAuthHeaders({
        "Content-Type": "application/json",
      }),
      credentials: "include",
      body: JSON.stringify(options),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to start deployment");
    }
    return data;
  },

  /**
   * List all deployments for a project
   */
  async listDeployments(
    projectId: string
  ): Promise<{ success: boolean; deployments: DeploymentRecord[] }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/deploy`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to list deployments");
    }
    return data;
  },

  /**
   * Get single deployment details
   */
  async getDeploymentDetails(
    projectId: string,
    deployId: string
  ): Promise<{ success: boolean; deployment: DeploymentRecord }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/deploy/${deployId}`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch deployment details");
    }
    return data;
  },

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(
    projectId: string,
    deployId: string
  ): Promise<{
    success: boolean;
    logs: DeploymentLog[];
    status: string;
    deployId: string;
  }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/deploy/${deployId}/logs`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch deployment logs");
    }
    return data;
  },

  /**
   * Redeploy an earlier deployment
   */
  async redeploy(
    projectId: string,
    deployId: string
  ): Promise<{ success: boolean; deployment: DeploymentRecord; message: string }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/deploy/${deployId}/redeploy`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to redeploy");
    }
    return data;
  },

  /**
   * Delete a deployment
   */
  async deleteDeployment(
    projectId: string,
    deployId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/deploy/${deployId}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to delete deployment");
    }
    return data;
  },

  /**
   * Get absolute public site URL for iframe or external link
   */
  getSiteUrl(projectId: string, deployId: string): string {
    return `${API_URL}/api/projects/${projectId}/deploy/${deployId}/site/`;
  },
};

export default deployService;
