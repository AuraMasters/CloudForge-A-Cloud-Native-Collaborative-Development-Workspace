import mongoose from "mongoose";

const commitChangeSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["added", "modified", "deleted"],
      default: "modified",
    },
    additions: {
      type: Number,
      default: 0,
    },
    deletions: {
      type: Number,
      default: 0,
    },
    patch: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const projectCommitSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    sha: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      name: {
        type: String,
        default: "CloudForge Developer",
      },
      email: {
        type: String,
        default: "developer@cloudforge.io",
      },
      avatarUrl: {
        type: String,
        default: "",
      },
    },
    branch: {
      type: String,
      default: "main",
      index: true,
    },
    changes: [commitChangeSchema],
    isGitHubCommit: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

projectCommitSchema.index({ projectId: 1, createdAt: -1 });

const ProjectCommit = mongoose.model("ProjectCommit", projectCommitSchema);

export default ProjectCommit;
