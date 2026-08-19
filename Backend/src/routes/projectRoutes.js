import express from "express";

import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  importGitHubRepository,
} from "../controllers/projectController.js";

import {
  getWorkspace,
  getProjectFiles,
  createProjectFile,
  updateProjectFile,
  renameProjectFile,
  deleteProjectFile,
  getProjectCommits,
  getProjectCommitDetails,
  createProjectCommit,
  createOrSwitchBranch,
  linkProjectToGitHub,
  publishProjectToGitHub,
  syncProjectWithGitHub,
  resetWorkspaceTemplate,
} from "../controllers/workspaceController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:id", getProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);
router.post("/import/github", importGitHubRepository);

router.get("/:id/workspace", getWorkspace);

router.get("/:id/files", getProjectFiles);
router.get("/:id/workspace/files", getProjectFiles);
router.post("/:id/files", createProjectFile);
router.post("/:id/workspace/files", createProjectFile);
router.put("/:id/files/:fileId", updateProjectFile);
router.put("/:id/workspace/files/:fileId", updateProjectFile);
router.put("/:id/files/:fileId/rename", renameProjectFile);
router.put("/:id/workspace/files/:fileId/rename", renameProjectFile);
router.delete("/:id/files/:fileId", deleteProjectFile);
router.delete("/:id/workspace/files/:fileId", deleteProjectFile);

router.get("/:id/git/commits", getProjectCommits);
router.get("/:id/workspace/commits", getProjectCommits);
router.get("/:id/git/commits/:sha", getProjectCommitDetails);
router.get("/:id/workspace/commits/:sha", getProjectCommitDetails);
router.post("/:id/git/commit", createProjectCommit);
router.post("/:id/workspace/commits", createProjectCommit);
router.post("/:id/git/branches", createOrSwitchBranch);
router.post("/:id/workspace/branches", createOrSwitchBranch);

router.post("/:id/git/link-github", linkProjectToGitHub);
router.post("/:id/workspace/link-github", linkProjectToGitHub);
router.post("/:id/git/publish-github", publishProjectToGitHub);
router.post("/:id/workspace/publish-github", publishProjectToGitHub);
router.post("/:id/git/sync", syncProjectWithGitHub);
router.post("/:id/workspace/sync-github", syncProjectWithGitHub);

router.post("/:id/workspace/reset-template", resetWorkspaceTemplate);

export default router;