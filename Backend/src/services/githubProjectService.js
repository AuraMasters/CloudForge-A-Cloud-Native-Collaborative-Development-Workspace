import GitHubConnection from "../models/GitHubConnection.js";
import Project from "../models/Project.js";
import { getRepository } from "./githubService.js";

export const importGitHubRepository = async (
  userId,
  repositoryOwner,
  repositoryName
) => {
  if (!repositoryOwner || !repositoryName) {
    throw new Error("Repository owner and name are required");
  }

  const connection = await GitHubConnection.findOne({
    user: userId,
  });

  if (!connection) {
    throw new Error("GitHub account is not connected");
  }

  const repository = await getRepository(
    connection.accessToken,
    repositoryOwner,
    repositoryName
  );

  const repositoryId = String(repository.id);

  const existingProject = await Project.findOne({
    owner: userId,
    "source.type": "github",
    "source.github.repositoryId": repositoryId,
  });

  if (existingProject) {
    return {
      project: existingProject,
      alreadyImported: true,
    };
  }

  const project = await Project.create({
    name: repository.name,

    description: repository.description || "",

    owner: userId,

    source: {
      type: "github",

      github: {
        repositoryId,

        owner: repository.owner.login,

        name: repository.name,

        fullName: repository.full_name,

        url: repository.html_url,

        defaultBranch: repository.default_branch || "main",

        cloneUrl: repository.clone_url,
      },
    },
  });

  return {
    project,
    alreadyImported: false,
  };
};