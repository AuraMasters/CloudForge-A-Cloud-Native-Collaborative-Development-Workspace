import API_URL, { getAuthHeaders } from "../config/api";
import { type PreviewInfoResponse } from "../types/preview";

class PreviewService {
  /**
   * Construct absolute URL for previewing an in-container port
   */
  getPreviewUrl(projectId: string, port: number, subpath: string = "/"): string {
    const cleanSubpath = subpath.startsWith("/") ? subpath : `/${subpath}`;
    return `${API_URL}/api/projects/${projectId}/preview/${port}${cleanSubpath}`;
  }

  /**
   * Fetch detected framework, start commands, and active listening ports
   */
  async getPreviewInfo(projectId: string): Promise<PreviewInfoResponse> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/preview/info`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Failed to fetch preview info (${res.status})`);
    }
    return await res.json();
  }

  /**
   * Start development server inside project workspace container
   */
  async startDevServer(
    projectId: string,
    customCommand?: string,
    port?: number
  ): Promise<{ message: string; port: number; activePorts: any[] }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/preview/start`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify({ customCommand, port }),
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (res.status === 429) {
        throw new Error("Server rate limit / bot challenge encountered (HTTP 429). Please wait a moment.");
      }
      throw new Error(`Preview server returned HTTP ${res.status}.`);
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || "Failed to start development server");
    }
    return data;
  }

  /**
   * Stop development server running on a specific port
   */
  async stopDevServer(projectId: string, port?: number): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/preview/stop`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify({ port }),
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (res.status === 429) {
        throw new Error("Server rate limit / bot challenge encountered (HTTP 429).");
      }
      throw new Error(`Preview server returned HTTP ${res.status}.`);
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || "Failed to stop development server");
    }
    return data;
  }
}

export const previewService = new PreviewService();
export default previewService;
