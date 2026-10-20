import mongoose from "mongoose";

const deploymentLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    stream: {
      type: String,
      enum: ["stdout", "stderr", "system"],
      default: "system",
    },
    message: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const deploymentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    deployId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "building", "ready", "failed", "stopped"],
      default: "queued",
      index: true,
    },
    target: {
      type: String,
      enum: ["static", "node", "python", "docker"],
      default: "static",
    },
    framework: {
      id: { type: String, default: "static" },
      name: { type: String, default: "Static HTML/JS" },
      icon: { type: String, default: "globe" },
    },
    buildCommand: {
      type: String,
      default: "npm run build",
    },
    outputDir: {
      type: String,
      default: "dist",
    },
    runtime: {
      type: String,
      default: "node",
    },
    branch: {
      type: String,
      default: "main",
    },
    commitSha: {
      type: String,
      default: null,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    siteUrl: {
      type: String,
      default: "",
    },
    artifactPath: {
      type: String,
      default: "",
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    logs: [deploymentLogSchema],
    error: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

deploymentSchema.index({ projectId: 1, createdAt: -1 });

const Deployment = mongoose.model("Deployment", deploymentSchema);
export default Deployment;
