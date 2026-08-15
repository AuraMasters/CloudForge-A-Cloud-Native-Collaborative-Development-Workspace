import mongoose from "mongoose";

const githubConnectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    githubUserId: {
      type: String,
      required: true,
    },

    githubUsername: {
      type: String,
      required: true,
    },

    githubEmail: {
      type: String,
      default: null,
    },

    accessToken: {
      type: String,
      required: true,
    },

    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const GitHubConnection = mongoose.model(
  "GitHubConnection",
  githubConnectionSchema
);

export default GitHubConnection;