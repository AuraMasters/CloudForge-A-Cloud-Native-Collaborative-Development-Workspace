import Project from "../models/Project.js";
import ProjectFile from "../models/ProjectFile.js";
import User from "../models/User.js";
import containerService from "../services/containerService.js";

export const createProject = async (req, res) => {
  try {
    const { name, description, envVariables = [] } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Project name is required",
      });
    }

    const userId = req.user._id || req.user.id;

    const project = await Project.create({
      name,
      description,
      owner: userId,
      envVariables,
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create project",
      error: error.message,
    });
  }
};

export const getProjects = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const projects = await Project.find({
      $or: [{ owner: userId }, { collaborators: userId }],
    })
      .populate("owner", "name email")
      .populate("collaborators", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      projects,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch projects",
      error: error.message,
    });
  }
};

export const getProject = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: userId }, { collaborators: userId }],
    })
      .populate("owner", "name email")
      .populate("collaborators", "name email");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.status(200).json({
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch project",
      error: error.message,
    });
  }
};

export const getCollaborators = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: userId }, { collaborators: userId }],
    })
      .populate("owner", "name email")
      .populate("collaborators", "name email");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({
      owner: project.owner,
      collaborators: project.collaborators || [],
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch collaborators", error: error.message });
  }
};

export const addCollaborator = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      owner: userId,
    });

    if (!project) {
      return res.status(403).json({ message: "Only the project owner can add collaborators" });
    }

    const targetUser = await User.findOne({ email: email.trim().toLowerCase() }).select("_id name email");
    if (!targetUser) {
      return res.status(404).json({ message: `No user found with email "${email}"` });
    }

    if (targetUser._id.equals(project.owner)) {
      return res.status(400).json({ message: "Owner is already a member of this project" });
    }

    if (project.collaborators.some((c) => c.equals(targetUser._id))) {
      return res.status(409).json({ message: "User is already a collaborator on this project" });
    }

    project.collaborators.push(targetUser._id);
    await project.save();

    res.status(200).json({
      message: `Added ${targetUser.name || targetUser.email} as collaborator`,
      collaborator: targetUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to add collaborator", error: error.message });
  }
};

export const removeCollaborator = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const targetUserId = req.params.userId;

    const project = await Project.findOne({
      _id: req.params.id,
      owner: userId,
    });

    if (!project) {
      return res.status(403).json({ message: "Only the project owner can remove collaborators" });
    }

    project.collaborators = project.collaborators.filter(
      (c) => c.toString() !== targetUserId
    );
    await project.save();

    res.status(200).json({ message: "Collaborator removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove collaborator", error: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { name, description, envVariables } = req.body;
    const userId = req.user._id || req.user.id;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (envVariables !== undefined) updateFields.envVariables = envVariables;

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: userId,
      },
      updateFields,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update project",
      error: error.message,
    });
  }
};

export const getProjectEnv = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const project = await Project.findOne({
      _id: req.params.id,
      owner: userId,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({
      envVariables: project.envVariables || [],
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch environment variables",
      error: error.message,
    });
  }
};

export const updateProjectEnv = async (req, res) => {
  try {
    const { envVariables } = req.body;

    if (!Array.isArray(envVariables)) {
      return res.status(400).json({ message: "envVariables must be an array" });
    }

    const userId = req.user._id || req.user.id;

    const cleanVars = envVariables
      .filter((v) => v && typeof v.key === "string" && v.key.trim().length > 0)
      .map((v) => ({
        key: v.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
        value: String(v.value !== undefined && v.value !== null ? v.value : ""),
      }));

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: userId,
      },
      { $set: { envVariables: cleanVars } },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({
      message: "Environment variables updated successfully",
      envVariables: project.envVariables || [],
      project,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update environment variables",
      error: error.message,
    });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Automatically clean up associated Docker container and workspace directory
    try {
      await containerService.deleteProjectContainer(req.params.id);
    } catch (cleanupErr) {
      console.warn(`Container cleanup error on project deletion (${req.params.id}):`, cleanupErr.message);
    }

    res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete project",
      error: error.message,
    });
  }
};