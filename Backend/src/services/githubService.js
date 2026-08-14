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

export const getRepository = async (
  accessToken,
  owner,
  repo
) => {
  try {
    const response = await githubApi.get(
      `/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "GitHub repository fetch error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to fetch GitHub repository");
  }
};