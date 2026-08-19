import axios from "axios";

const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  },
});

export const exchangeCodeForToken = async (code) => {
  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.data.access_token) {
      throw new Error(
        response.data.error_description ||
          "Failed to obtain GitHub access token"
      );
    }

    return response.data.access_token;
  } catch (error) {
    console.error(
      "GitHub token exchange error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to connect GitHub account");
  }
};

export const getGitHubUser = async (accessToken) => {
  try {
    const response = await githubApi.get("/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      "GitHub user fetch error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch GitHub user");
  }
};

export const getRepositories = async (accessToken) => {
  try {
    const response = await githubApi.get("/user/repos", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        visibility: "all",
        affiliation: "owner,collaborator,organization_member",
        sort: "updated",
        direction: "desc",
        per_page: 100,
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      "GitHub repositories fetch error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch GitHub repositories");
  }
};

export const getRepository = async (accessToken, owner, repo) => {
  try {
    const response = await githubApi.get(`/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      "GitHub repository fetch error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch GitHub repository");
  }
};

export const getRepoTree = async (accessToken, owner, repo, branch = "main") => {
  try {
    const response = await githubApi.get(
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "GitHub tree fetch error:",
      error.response?.data || error.message
    );
    if (branch === "main") {
      try {
        const fallback = await githubApi.get(
          `/repos/${owner}/${repo}/git/trees/master?recursive=1`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        return fallback.data;
      } catch {
        // Return empty tree
      }
    }
    return { tree: [], truncated: false };
  }
};

export const getRawFileContent = async (accessToken, owner, repo, path, ref = "main") => {
  try {
    const response = await githubApi.get(
      `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.data && response.data.content) {
      const decodedContent = Buffer.from(response.data.content, "base64").toString("utf-8");
      return {
        content: decodedContent,
        sha: response.data.sha,
        size: response.data.size,
      };
    }
    return { content: "", sha: "", size: 0 };
  } catch (error) {
    console.error(
      `GitHub get content error for ${path}:`,
      error.response?.data || error.message
    );
    return { content: "", sha: "", size: 0 };
  }
};

export const getRepoCommits = async (accessToken, owner, repo, branch = "main", perPage = 30) => {
  try {
    const response = await githubApi.get(`/repos/${owner}/${repo}/commits`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        sha: branch,
        per_page: perPage,
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      "GitHub commits fetch error:",
      error.response?.data || error.message
    );
    return [];
  }
};

export const getCommitDetails = async (accessToken, owner, repo, commitSha) => {
  try {
    const response = await githubApi.get(
      `/repos/${owner}/${repo}/commits/${commitSha}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      `GitHub commit details error for ${commitSha}:`,
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch commit details");
  }
};

export const createGitHubRepository = async (
  accessToken,
  name,
  description = "",
  isPrivate = false
) => {
  try {
    const response = await githubApi.post(
      "/user/repos",
      {
        name,
        description,
        private: isPrivate,
        auto_init: true,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "GitHub create repository error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message || "Failed to create GitHub repository"
    );
  }
};

export const commitAndPushFile = async (
  accessToken,
  owner,
  repo,
  path,
  content,
  message,
  branch = "main",
  sha = null
) => {
  try {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    const base64Content = Buffer.from(content, "utf-8").toString("base64");

    const payload = {
      message: message || `Update ${cleanPath}`,
      content: base64Content,
      branch,
    };

    if (sha) {
      payload.sha = sha;
    }

    const response = await githubApi.put(
      `/repos/${owner}/${repo}/contents/${cleanPath}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      `GitHub commit & push file error for ${path}:`,
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message || `Failed to push ${path} to GitHub`
    );
  }
};