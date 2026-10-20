import express from "express";
import {
  submitRunJob,
  submitBuildJob,
  getJobStatus,
  stopJob,
  getPreviewStatus,
} from "../controllers/executionController.js";
import {
  startDevServer,
  stopDevServer,
} from "../controllers/previewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router({ mergeParams: true });

router.use(protect);

router.post("/run", submitRunJob);
router.post("/build", submitBuildJob);
router.get("/status/:jobId", getJobStatus);
router.post("/stop/:jobId", stopJob);

// Preview endpoints within execute namespace
router.get("/preview", getPreviewStatus);
router.post("/preview/start", startDevServer);
router.post("/preview/stop", stopDevServer);

export default router;
