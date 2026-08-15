import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    source: {
      type: {
        type: String,
        enum: ["blank", "github"],
        default: "blank",
      },

      github: {
        repositoryId: {
          type: String,
          default: null,
        },

        owner: {
          type: String,
          default: null,
        },

        name: {
          type: String,
          default: null,
        },

        fullName: {
          type: String,
          default: null,
        },

        url: {
          type: String,
          default: null,
        },

        defaultBranch: {
          type: String,
          default: null,
        },

        cloneUrl: {
          type: String,
          default: null,
        },
      },
    },

    template: {
      type: String,
      enum: ["react", "nodejs", "python", "html-css", "java", "go", "blank"],
      default: "blank",
    },

    currentBranch: {
      type: String,
      default: "main",
      trim: true,
    },

    branches: {
      type: [String],
      default: ["main"],
    },

    gitRemote: {
      connected: {
        type: Boolean,
        default: false,
      },
      owner: {
        type: String,
        default: null,
      },
      repo: {
        type: String,
        default: null,
      },
      fullName: {
        type: String,
        default: null,
      },
      url: {
        type: String,
        default: null,
      },
      cloneUrl: {
        type: String,
        default: null,
      },
      defaultBranch: {
        type: String,
        default: "main",
      },
      lastSyncedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({
  owner: 1,
  "source.github.repositoryId": 1,
});

const Project = mongoose.model("Project", projectSchema);

export default Project;