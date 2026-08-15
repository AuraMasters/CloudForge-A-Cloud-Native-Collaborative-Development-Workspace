import crypto from "crypto";
import Project from "../models/Project.js";
import ProjectFile from "../models/ProjectFile.js";
import ProjectCommit from "../models/ProjectCommit.js";
import GitHubConnection from "../models/GitHubConnection.js";
import { getTemplateFiles } from "../services/templateService.js";
import {
  getRepoTree,
  getRawFileContent,
  getRepoCommits,
  getCommitDetails,
  createGitHubRepository,
  commitAndPushFile,
  getRepository,
} from "../services/githubService.js";

const detectLanguage = (filename) => {
  const ext = filename?.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "mjs":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "py":
      return "python";
    case "html":
    case "htm":
      return "html";
    case "css":
    case "scss":
    case "less":
      return "css";
    case "json":
      return "json";
    case "md":
    case "markdown":
      return "markdown";
    case "java":
      return "java";
    case "go":
      return "go";
    case "cpp":
    case "c":
    case "h":
    case "hpp":
      return "cpp";
    case "sh":
    case "bash":
      return "shell";
    case "yml":
    case "yaml":
      return "yaml";
    default:
      return "plaintext";
  }
};

/**
 * GET /api/projects/:id/workspace
 * Initialize and fetch complete workspace data
 */
export const getWorkspace = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    let files = await ProjectFile.find({ projectId: project._id }).sort({
      path: 1,
    });

    // If project has no files yet, seed initial files
    if (files.length === 0) {
      if (project.source?.type === "github" && project.source?.github) {
        // Try fetching from GitHub if account is connected
        const connection = await GitHubConnection.findOne({
          user: req.user.id,
        });

        let seededFromGitHub = false;

        if (connection?.accessToken) {
          try {
            const treeData = await getRepoTree(
              connection.accessToken,
              project.source.github.owner,
              project.source.github.name,
              project.source.github.defaultBranch || "main"
            );

            if (treeData?.tree && treeData.tree.length > 0) {
              const filesToCreate = [];
              const treeItems = treeData.tree.slice(0, 40);

              for (const item of treeItems) {
                const itemPath = "/" + item.path;
                const isDir = item.type === "tree";
                const itemName = item.path.split("/").pop();

                let content = "";
                if (!isDir && item.size && item.size < 50000) {
                  const raw = await getRawFileContent(
                    connection.accessToken,
                    project.source.github.owner,
                    project.source.github.name,
                    item.path,
                    project.source.github.defaultBranch || "main"
                  );
                  content = raw.content || "";
                }

                filesToCreate.push({
                  projectId: project._id,
                  name: itemName,
                  path: itemPath,
                  type: isDir ? "directory" : "file",
                  content,
                  language: isDir ? "plaintext" : detectLanguage(itemName),
                  size: content.length,
                  sha: item.sha,
                });
              }

              if (filesToCreate.length > 0) {
                files = await ProjectFile.insertMany(filesToCreate);
                seededFromGitHub = true;
              }
            }
          } catch (ghErr) {
            console.error("Failed to seed tree from GitHub:", ghErr.message);
          }
        }

        if (!seededFromGitHub) {
          const templateFiles = getTemplateFiles(
            project.template || "blank",
            project.name
          );
          const docs = templateFiles.map((f) => ({
            ...f,
            projectId: project._id,
            size: f.content?.length || 0,
          }));
          files = await ProjectFile.insertMany(docs);
        }
      } else {
        // Normal / Blank project template seeding
        const templateType = project.template || "blank";
        const templateFiles = getTemplateFiles(templateType, project.name);
        const docs = templateFiles.map((f) => ({
          ...f,
          projectId: project._id,
          size: f.content?.length || 0,
        }));
        files = await ProjectFile.insertMany(docs);

        // Create initial local Git commit
        const initialSha = crypto.randomBytes(20).toString("hex");
        await ProjectCommit.create({
          projectId: project._id,
          sha: initialSha,
          message: "Initial commit - CloudForge workspace initialized",
          author: {
            name: req.user.name || "CloudForge Developer",
            email: req.user.email || "developer@cloudforge.io",
            avatarUrl: "",
          },
          branch: project.currentBranch || "main",
          changes: files
            .filter((f) => f.type === "file")
            .map((f) => ({
              path: f.path,
              status: "added",
              additions: f.content.split("\n").length,
              deletions: 0,
              patch: `@@ -0,0 +1,${f.content.split("\n").length} @@\n+${f.content.replace(/\n/g, "\n+")}`,
            })),
          isGitHubCommit: false,
        });
      }
    }

    // Fetch commits
    let commits = [];
    const isGitHubLinked =
      project.source?.type === "github" || project.gitRemote?.connected;

    if (isGitHubLinked) {
      const connection = await GitHubConnection.findOne({ user: req.user.id });
      const owner =
        project.source?.github?.owner || project.gitRemote?.owner;
      const repo = project.source?.github?.name || project.gitRemote?.repo;

      if (connection?.accessToken && owner && repo) {
        try {
          const ghCommits = await getRepoCommits(
            connection.accessToken,
            owner,
            repo,
            project.currentBranch || "main",
            20
          );

          commits = ghCommits.map((c) => ({
            _id: c.sha,
            sha: c.sha,
            message: c.commit?.message || "No commit message",
            author: {
              name: c.commit?.author?.name || c.author?.login || "GitHub User",
              email: c.commit?.author?.email || "",
              avatarUrl: c.author?.avatar_url || "",
            },
            branch: project.currentBranch || "main",
            createdAt: c.commit?.author?.date || new Date().toISOString(),
            isGitHubCommit: true,
          }));
        } catch (e) {
          console.error("Error fetching GitHub commits:", e.message);
        }
      }
    }

    if (commits.length === 0) {
      commits = await ProjectCommit.find({
        projectId: project._id,
        branch: project.currentBranch || "main",
      })
        .sort({ createdAt: -1 })
        .limit(30);
    }

    return res.json({
      project,
      files,
      commits,
      branches: project.branches || ["main"],
      currentBranch: project.currentBranch || "main",
    });
  } catch (error) {
    console.error("Get workspace error:", error);
    return res
      .status(500)
      .json({ message: "Failed to load workspace", error: error.message });
  }
};

/**
 * GET /api/projects/:id/files (or /workspace/files)
 */
export const getProjectFiles = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    let files = await ProjectFile.find({ projectId: project._id }).sort({
      path: 1,
    });

    if (files.length === 0) {
      const templateFiles = getTemplateFiles(
        project.template || "blank",
        project.name
      );
      const docs = templateFiles.map((f) => ({
        ...f,
        projectId: project._id,
        size: f.content?.length || 0,
      }));
      files = await ProjectFile.insertMany(docs);
    }

    return res.json({ files });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch files", error: error.message });
  }
};

/**
 * POST /api/projects/:id/files (or /workspace/files)
 */
export const createProjectFile = async (req, res) => {
  try {
    const { name, path, type = "file", content = "" } = req.body;

    if (!name || !path) {
      return res.status(400).json({ message: "Name and path are required" });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    const existing = await ProjectFile.findOne({
      projectId: project._id,
      path: normalizedPath,
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "A file or folder already exists at this path" });
    }

    const file = await ProjectFile.create({
      projectId: project._id,
      name,
      path: normalizedPath,
      type,
      content: type === "directory" ? "" : content,
      language: type === "directory" ? "plaintext" : detectLanguage(name),
      size: type === "directory" ? 0 : content.length,
    });

    return res.status(201).json({ message: "Created successfully", file });
  } catch (error) {
    console.error("Create file error:", error);
    return res
      .status(500)
      .json({ message: "Failed to create file", error: error.message });
  }
};

/**
 * PUT /api/projects/:id/files/:fileId
 */
export const updateProjectFile = async (req, res) => {
  try {
    const { content, name, path } = req.body;

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const file = await ProjectFile.findOne({
      _id: req.params.fileId,
      projectId: project._id,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (content !== undefined) {
      file.content = content;
      file.size = content.length;
    }

    if (name && name !== file.name) {
      file.name = name;
      file.language = detectLanguage(name);
    }

    if (path && path !== file.path) {
      file.path = path.startsWith("/") ? path : `/${path}`;
    }

    await file.save();

    return res.json({ message: "File updated successfully", file });
  } catch (error) {
    console.error("Update file error:", error);
    return res
      .status(500)
      .json({ message: "Failed to update file", error: error.message });
  }
};

/**
 * PUT /api/projects/:id/files/:fileId/rename
 */
export const renameProjectFile = async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName || !newName.trim()) {
      return res.status(400).json({ message: "New name is required" });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const file = await ProjectFile.findOne({
      _id: req.params.fileId,
      projectId: project._id,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const oldPath = file.path;
    const parts = oldPath.split("/").filter(Boolean);
    parts[parts.length - 1] = newName.trim();
    const newPath = "/" + parts.join("/");

    if (file.type === "directory") {
      file.name = newName.trim();
      file.path = newPath;
      await file.save();

      const children = await ProjectFile.find({
        projectId: project._id,
        path: { $regex: `^${oldPath}/` },
      });

      for (const child of children) {
        child.path = child.path.replace(oldPath, newPath);
        await child.save();
      }
    } else {
      file.name = newName.trim();
      file.path = newPath;
      file.language = detectLanguage(newName.trim());
      await file.save();
    }

    return res.json({ message: "Renamed successfully", file });
  } catch (error) {
    console.error("Rename file error:", error);
    return res
      .status(500)
      .json({ message: "Failed to rename file", error: error.message });
  }
};

/**
 * DELETE /api/projects/:id/files/:fileId
 */
export const deleteProjectFile = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const file = await ProjectFile.findOne({
      _id: req.params.fileId,
      projectId: project._id,
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (file.type === "directory") {
      await ProjectFile.deleteMany({
        projectId: project._id,
        path: { $regex: `^${file.path}(/|$)` },
      });
    } else {
      await ProjectFile.deleteOne({ _id: file._id });
    }

    return res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    return res
      .status(500)
      .json({ message: "Failed to delete file", error: error.message });
  }
};

/**
 * GET /api/projects/:id/git/commits
 */
export const getProjectCommits = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isGitHubLinked =
      project.source?.type === "github" || project.gitRemote?.connected;

    if (isGitHubLinked) {
      const connection = await GitHubConnection.findOne({ user: req.user.id });
      const owner =
        project.source?.github?.owner || project.gitRemote?.owner;
      const repo = project.source?.github?.name || project.gitRemote?.repo;

      if (connection?.accessToken && owner && repo) {
        try {
          const ghCommits = await getRepoCommits(
            connection.accessToken,
            owner,
            repo,
            project.currentBranch || "main",
            30
          );

          const formatted = ghCommits.map((c) => ({
            _id: c.sha,
            sha: c.sha,
            message: c.commit?.message || "No commit message",
            author: {
              name: c.commit?.author?.name || c.author?.login || "GitHub User",
              email: c.commit?.author?.email || "",
              avatarUrl: c.author?.avatar_url || "",
            },
            branch: project.currentBranch || "main",
            createdAt: c.commit?.author?.date || new Date().toISOString(),
            isGitHubCommit: true,
          }));

          return res.json({ commits: formatted });
        } catch (err) {
          console.error("Failed to get GitHub commits:", err.message);
        }
      }
    }

    const commits = await ProjectCommit.find({
      projectId: project._id,
      branch: project.currentBranch || "main",
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ commits });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch commits", error: error.message });
  }
};

/**
 * GET /api/projects/:id/git/commits/:sha
 */
export const getProjectCommitDetails = async (req, res) => {
  try {
    const { sha } = req.params;
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isGitHubLinked =
      project.source?.type === "github" || project.gitRemote?.connected;

    if (isGitHubLinked) {
      const connection = await GitHubConnection.findOne({ user: req.user.id });
      const owner =
        project.source?.github?.owner || project.gitRemote?.owner;
      const repo = project.source?.github?.name || project.gitRemote?.repo;

      if (connection?.accessToken && owner && repo) {
        try {
          const ghDetails = await getCommitDetails(
            connection.accessToken,
            owner,
            repo,
            sha
          );

          return res.json({
            commit: {
              sha: ghDetails.sha,
              message: ghDetails.commit?.message,
              author: {
                name:
                  ghDetails.commit?.author?.name ||
                  ghDetails.author?.login ||
                  "GitHub User",
                email: ghDetails.commit?.author?.email || "",
                avatarUrl: ghDetails.author?.avatar_url || "",
              },
              createdAt: ghDetails.commit?.author?.date,
              stats: ghDetails.stats,
              changes: (ghDetails.files || []).map((f) => ({
                path: f.filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                patch: f.patch || "",
              })),
              isGitHubCommit: true,
            },
          });
        } catch (e) {
          console.error("GitHub commit details fetch error:", e.message);
        }
      }
    }

    const localCommit = await ProjectCommit.findOne({
      projectId: project._id,
      sha,
    });

    if (!localCommit) {
      return res.status(404).json({ message: "Commit not found" });
    }

    return res.json({ commit: localCommit });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch commit details", error: error.message });
  }
};

/**
 * POST /api/projects/:id/git/commit
 */
export const createProjectCommit = async (req, res) => {
  try {
    const { message, changes = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Commit message is required" });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const sha = crypto.randomBytes(20).toString("hex");
    const branch = project.currentBranch || "main";

    const isGitHubLinked =
      project.source?.type === "github" || project.gitRemote?.connected;
    let pushedToGitHub = false;

    if (isGitHubLinked && changes.length > 0) {
      const connection = await GitHubConnection.findOne({ user: req.user.id });
      const owner =
        project.source?.github?.owner || project.gitRemote?.owner;
      const repo = project.source?.github?.name || project.gitRemote?.repo;

      if (connection?.accessToken && owner && repo) {
        try {
          for (const change of changes) {
            const fileDoc = await ProjectFile.findOne({
              projectId: project._id,
              path: change.path,
            });

            if (fileDoc && fileDoc.type === "file") {
              await commitAndPushFile(
                connection.accessToken,
                owner,
                repo,
                change.path,
                fileDoc.content,
                message,
                branch,
                fileDoc.sha || null
              );
            }
          }
          pushedToGitHub = true;
        } catch (pushErr) {
          console.warn("GitHub push notice:", pushErr.message);
        }
      }
    }

    const commit = await ProjectCommit.create({
      projectId: project._id,
      sha,
      message: message.trim(),
      author: {
        name: req.user.name || "CloudForge Developer",
        email: req.user.email || "developer@cloudforge.io",
        avatarUrl: "",
      },
      branch,
      changes: changes.map((c) => ({
        path: c.path,
        status: c.status || "modified",
        additions: c.additions || 1,
        deletions: c.deletions || 0,
        patch: c.patch || "",
      })),
      isGitHubCommit: pushedToGitHub,
    });

    project.updatedAt = new Date();
    await project.save();

    return res.status(201).json({
      message: pushedToGitHub
        ? "Committed and pushed to GitHub successfully"
        : "Committed to local workspace successfully",
      commit,
      pushedToGitHub,
    });
  } catch (error) {
    console.error("Create commit error:", error);
    return res
      .status(500)
      .json({ message: "Failed to create commit", error: error.message });
  }
};

/**
 * POST /api/projects/:id/git/branches
 */
export const createOrSwitchBranch = async (req, res) => {
  try {
    const { branch, branchName, createNew = false } = req.body;
    const targetBranch = branch || branchName;

    if (!targetBranch || !targetBranch.trim()) {
      return res.status(400).json({ message: "Branch name is required" });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const cleanBranch = targetBranch.trim().toLowerCase().replace(/\s+/g, "-");

    if (createNew && !project.branches.includes(cleanBranch)) {
      project.branches.push(cleanBranch);
    }

    project.currentBranch = cleanBranch;
    await project.save();

    return res.json({
      message: `Switched to branch '${cleanBranch}'`,
      currentBranch: project.currentBranch,
      branches: project.branches,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to switch branch", error: error.message });
  }
};

/**
 * POST /api/projects/:id/git/link-github
 */
export const linkProjectToGitHub = async (req, res) => {
  try {
    const { repoUrl, repositoryUrl, owner: inputOwner, repo: inputRepo } = req.body;
    const rawUrl = repoUrl || repositoryUrl;

    let repoOwner = inputOwner;
    let repoName = inputRepo;

    if (rawUrl) {
      const match = rawUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        repoOwner = match[1];
        repoName = match[2].replace(/\.git$/, "");
      } else {
        const parts = rawUrl.trim().split("/");
        if (parts.length === 2) {
          repoOwner = parts[0];
          repoName = parts[1];
        }
      }
    }

    if (!repoOwner || !repoName) {
      return res.status(400).json({
        message: "Valid GitHub repository owner and name are required",
      });
    }

    const connection = await GitHubConnection.findOne({ user: req.user.id });
    if (!connection) {
      return res.status(400).json({
        message: "Please connect your GitHub account in Integrations first",
      });
    }

    const ghRepo = await getRepository(
      connection.accessToken,
      repoOwner,
      repoName
    );

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.gitRemote = {
      connected: true,
      owner: ghRepo.owner.login,
      repo: ghRepo.name,
      fullName: ghRepo.full_name,
      url: ghRepo.html_url,
      cloneUrl: ghRepo.clone_url,
      defaultBranch: ghRepo.default_branch || "main",
      lastSyncedAt: new Date(),
    };

    if (!project.branches.includes(ghRepo.default_branch || "main")) {
      project.branches.push(ghRepo.default_branch || "main");
    }
    project.currentBranch = ghRepo.default_branch || "main";

    await project.save();

    return res.json({
      message: `Successfully linked project to ${ghRepo.full_name}`,
      project,
    });
  } catch (error) {
    console.error("Link GitHub error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to link GitHub repository" });
  }
};

/**
 * POST /api/projects/:id/git/publish-github
 */
export const publishProjectToGitHub = async (req, res) => {
  try {
    const { name, description = "", isPrivate = false } = req.body;

    const connection = await GitHubConnection.findOne({ user: req.user.id });
    if (!connection) {
      return res.status(400).json({
        message: "Please connect your GitHub account in Integrations first",
      });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const repoName = (name || project.name).trim().replace(/\s+/g, "-");

    const ghRepo = await createGitHubRepository(
      connection.accessToken,
      repoName,
      description || project.description || "Created with CloudForge Workspace",
      isPrivate
    );

    const files = await ProjectFile.find({
      projectId: project._id,
      type: "file",
    });

    for (const file of files) {
      try {
        await commitAndPushFile(
          connection.accessToken,
          ghRepo.owner.login,
          ghRepo.name,
          file.path,
          file.content,
          `Initial CloudForge commit: ${file.name}`,
          ghRepo.default_branch || "main"
        );
      } catch (pushErr) {
        console.warn(`File push skipped for ${file.path}:`, pushErr.message);
      }
    }

    project.gitRemote = {
      connected: true,
      owner: ghRepo.owner.login,
      repo: ghRepo.name,
      fullName: ghRepo.full_name,
      url: ghRepo.html_url,
      cloneUrl: ghRepo.clone_url,
      defaultBranch: ghRepo.default_branch || "main",
      lastSyncedAt: new Date(),
    };

    project.currentBranch = ghRepo.default_branch || "main";
    await project.save();

    return res.status(201).json({
      message: `Successfully published project to ${ghRepo.full_name}!`,
      project,
      repository: ghRepo,
    });
  } catch (error) {
    console.error("Publish to GitHub error:", error);
    return res.status(500).json({
      message: error.message || "Failed to publish project to GitHub",
    });
  }
};

/**
 * POST /api/projects/:id/git/sync (or /workspace/sync-github)
 */
export const syncProjectWithGitHub = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isGitHubLinked =
      project.source?.type === "github" || project.gitRemote?.connected;

    if (!isGitHubLinked) {
      return res
        .status(400)
        .json({ message: "Project is not linked to any GitHub repository" });
    }

    const connection = await GitHubConnection.findOne({ user: req.user.id });
    if (!connection) {
      return res
        .status(400)
        .json({ message: "GitHub account is not connected" });
    }

    const owner = project.source?.github?.owner || project.gitRemote?.owner;
    const repo = project.source?.github?.name || project.gitRemote?.repo;
    const branch = project.currentBranch || "main";

    // 1. Pull latest tree from GitHub
    const treeData = await getRepoTree(
      connection.accessToken,
      owner,
      repo,
      branch
    );

    let updatedFiles = [];

    if (treeData?.tree && treeData.tree.length > 0) {
      const treeItems = treeData.tree.slice(0, 40);

      for (const item of treeItems) {
        const itemPath = "/" + item.path;
        const isDir = item.type === "tree";
        const itemName = item.path.split("/").pop();

        let content = "";
        if (!isDir && item.size && item.size < 50000) {
          const raw = await getRawFileContent(
            connection.accessToken,
            owner,
            repo,
            item.path,
            branch
          );
          content = raw.content || "";
        }

        const existing = await ProjectFile.findOne({
          projectId: project._id,
          path: itemPath,
        });

        if (existing) {
          if (!isDir) existing.content = content;
          existing.size = isDir ? 0 : content.length;
          existing.sha = item.sha;
          await existing.save();
          updatedFiles.push(existing);
        } else {
          const created = await ProjectFile.create({
            projectId: project._id,
            name: itemName,
            path: itemPath,
            type: isDir ? "directory" : "file",
            content,
            language: isDir ? "plaintext" : detectLanguage(itemName),
            size: isDir ? 0 : content.length,
            sha: item.sha,
          });
          updatedFiles.push(created);
        }
      }
    }

    project.gitRemote = project.gitRemote || {};
    project.gitRemote.lastSyncedAt = new Date();
    await project.save();

    const allFiles = await ProjectFile.find({ projectId: project._id }).sort({
      path: 1,
    });

    const ghCommits = await getRepoCommits(
      connection.accessToken,
      owner,
      repo,
      branch,
      20
    );

    const formattedCommits = ghCommits.map((c) => ({
      _id: c.sha,
      sha: c.sha,
      message: c.commit?.message || "No commit message",
      author: {
        name: c.commit?.author?.name || c.author?.login || "GitHub User",
        email: c.commit?.author?.email || "",
        avatarUrl: c.author?.avatar_url || "",
      },
      branch,
      createdAt: c.commit?.author?.date || new Date().toISOString(),
      isGitHubCommit: true,
    }));

    return res.json({
      message: `Successfully synced with GitHub ${owner}/${repo} (${branch})`,
      lastSyncedAt: project.gitRemote.lastSyncedAt,
      files: allFiles,
      commits: formattedCommits,
    });
  } catch (error) {
    console.error("Sync GitHub error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to sync with GitHub" });
  }
};

/**
 * POST /api/projects/:id/workspace/reset-template
 * Switch template preset and re-seed workspace files
 */
export const resetWorkspaceTemplate = async (req, res) => {
  try {
    const { template } = req.body;
    if (!template) {
      return res
        .status(400)
        .json({ message: "Template preset name is required" });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // 1. Delete existing workspace files
    await ProjectFile.deleteMany({ projectId: project._id });

    // 2. Generate new template files
    const templateFiles = getTemplateFiles(template, project.name);
    const docs = templateFiles.map((f) => ({
      ...f,
      projectId: project._id,
      size: f.content?.length || 0,
    }));
    const newFiles = await ProjectFile.insertMany(docs);

    // 3. Create new commit
    const initialSha = crypto.randomBytes(20).toString("hex");
    await ProjectCommit.create({
      projectId: project._id,
      sha: initialSha,
      message: `Switched template preset to ${template}`,
      author: {
        name: req.user.name || "CloudForge Developer",
        email: req.user.email || "developer@cloudforge.io",
        avatarUrl: "",
      },
      branch: project.currentBranch || "main",
      changes: newFiles
        .filter((f) => f.type === "file")
        .map((f) => ({
          path: f.path,
          status: "added",
          additions: f.content.split("\n").length,
          deletions: 0,
          patch: `@@ -0,0 +1,${f.content.split("\n").length} @@\n+${f.content.replace(/\n/g, "\n+")}`,
        })),
      isGitHubCommit: false,
    });

    // 4. Update project model
    project.template = template;
    await project.save();

    const commits = await ProjectCommit.find({
      projectId: project._id,
      branch: project.currentBranch || "main",
    })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.json({
      message: `Workspace reset to ${template} template successfully`,
      project,
      files: newFiles,
      commits,
    });
  } catch (error) {
    console.error("Reset template error:", error);
    return res
      .status(500)
      .json({ message: "Failed to reset template", error: error.message });
  }
};

