import API_URL, { getAuthHeaders, getWsUrl } from "../config/api";
import {
  type ContainerInfo,
  type CommandExecResult,
  type ContainerStatusResponse,
} from "../types/container";

class ContainerService {
  /**
   * Get WebSocket URL for the interactive container terminal
   */
  getTerminalWsUrl(projectId: string, tabId: string = "tab-1", cols: number = 80, rows: number = 24): string {
    const baseWs = getWsUrl("/ws/terminal");
    const token = typeof window !== "undefined" ? localStorage.getItem("cf_auth_token") : "";
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
    return `${baseWs}?projectId=${encodeURIComponent(projectId)}&tabId=${encodeURIComponent(
      tabId
    )}&cols=${cols}&rows=${rows}${tokenParam}`;
  }

  private async parseResponse<T = any>(res: Response, defaultErrMsg: string): Promise<T> {
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (res.status === 429) {
        throw new Error("Server rate limit or bot challenge encountered (HTTP 429). Please wait a few seconds and try again.");
      }
      if (res.status >= 500) {
        throw new Error(`Cloud server is waking up or temporarily unavailable (HTTP ${res.status}). Please try again.`);
      }
      throw new Error(`${defaultErrMsg} (HTTP ${res.status})`);
    }

    if (!res.ok) {
      throw new Error(data?.message || data?.error || defaultErrMsg);
    }
    return data as T;
  }

  /**
   * Fetch live container, Docker daemon, and Cloud Runner status for a project
   */
  async getStatus(projectId: string): Promise<ContainerStatusResponse> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/container/status`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return await this.parseResponse<ContainerStatusResponse>(res, "Failed to fetch container status");
  }

  /**
   * Start / create dedicated Docker container for a project
   */
  async startContainer(projectId: string, env: Record<string, string> = {}): Promise<{ container: ContainerInfo; message: string }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/container/start`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify({ env }),
    });
    return await this.parseResponse(res, "Failed to start container");
  }

  /**
   * Stop project container
   */
  async stopContainer(projectId: string): Promise<{ container: ContainerInfo; message: string }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/container/stop`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return await this.parseResponse(res, "Failed to stop container");
  }

  /**
   * Restart project container
   */
  async restartContainer(projectId: string): Promise<{ container: ContainerInfo; message: string }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/container/restart`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    return await this.parseResponse(res, "Failed to restart container");
  }

  /**
   * Rebuild project container from scratch
   */
  async rebuildContainer(projectId: string): Promise<{ container: ContainerInfo; message: string }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/container/rebuild`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to rebuild container");
    }
    return data;
  }

  /**
   * Force sync all MongoDB project files to the container disk workspace
   */
  async syncFiles(projectId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/container/sync-files`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to sync files to container");
    }
    return data;
  }

  /**
   * Execute a command non-interactively
   */
  async execCommand(projectId: string, command: string, env: Record<string, string> = {}): Promise<CommandExecResult> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/container/exec`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify({ command, env }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to execute command");
    }
    return data.result;
  }
}

export const containerService = new ContainerService();
export default containerService;
