import express from "express";
import {
  startDeployment,
  listDeployments,
  getDeploymentDetails,
  getDeploymentLogs,
  stopDeployment,
  redeployDeployment,
  deleteDeployment,
  serveDeployedSite,
} from "../controllers/deployController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router({ mergeParams: true });

// Public / iframe route for viewing deployed sites (matches /:deployId/site and all subpaths)
router.use("/:deployId/site", serveDeployedSite);

// Protected deployment management API routes
router.use(protect);

router.post("/", startDeployment);
router.get("/", listDeployments);
router.get("/:deployId", getDeploymentDetails);
router.get("/:deployId/logs", getDeploymentLogs);
router.post("/:deployId/stop", stopDeployment);
router.post("/:deployId/redeploy", redeployDeployment);
router.delete("/:deployId", deleteDeployment);

export default router;
