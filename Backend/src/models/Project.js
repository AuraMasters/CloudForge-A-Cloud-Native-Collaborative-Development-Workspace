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

    language: {
      type: String,
      default: "JavaScript",
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