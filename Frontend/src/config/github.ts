import API_URL from "./api";

export const githubApi = {
  connect: () => {
    window.location.href = `${API_URL}/api/github/connect`;
  },

  getStatus: async () => {
    const response = await fetch(
      `${API_URL}/api/github/status`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to get GitHub status"
      );
    }

    return data;
  },

  getRepositories: async () => {
    const response = await fetch(
      `${API_URL}/api/github/repos`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch GitHub repositories"
      );
    }

    return data;
  },

  getRepository: async (
    owner: string,
    repo: string
  ) => {
    const response = await fetch(
      `${API_URL}/api/github/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(repo)}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch GitHub repository"
      );
    }

    return data;
  },

  disconnect: async () => {
    const response = await fetch(
      `${API_URL}/api/github/disconnect`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to disconnect GitHub"
      );
    }

    return data;
  },
};