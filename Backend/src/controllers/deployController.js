import deploymentService from "../services/deploymentService.js";

/**
 * Start a new deployment
 * @route POST /api/projects/:id/deploy
 */
export const startDeployment = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { target, buildCommand, outputDir, envOverrides } = req.body;
    const userId = req.user?._id;

    const deployment = await deploymentService.startDeploy(
      projectId,
      { target, buildCommand, outputDir, envOverrides },
      userId
    );

    res.status(202).json({
      success: true,
      deployment,
      message: "Deployment started successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List all deployments for project
 * @route GET /api/projects/:id/deploy
 */
export const listDeployments = async (req, res) => {
  try {
    const projectId = req.params.id;
    const deployments = await deploymentService.listDeployments(projectId);
    res.status(200).json({ success: true, deployments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get deployment details
 * @route GET /api/projects/:id/deploy/:deployId
 */
export const getDeploymentDetails = async (req, res) => {
  try {
    const { id: projectId, deployId } = req.params;
    const deployment = await deploymentService.getDeployment(projectId, deployId);

    if (!deployment) {
      return res.status(404).json({ success: false, message: "Deployment not found" });
    }

    res.status(200).json({ success: true, deployment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get deployment logs
 * @route GET /api/projects/:id/deploy/:deployId/logs
 */
export const getDeploymentLogs = async (req, res) => {
  try {
    const { id: projectId, deployId } = req.params;
    const deployment = await deploymentService.getDeploymentLogs(projectId, deployId);
    res.status(200).json({
      success: true,
      logs: deployment.logs,
      status: deployment.status,
      deployId: deployment.deployId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Redeploy an earlier deployment
 * @route POST /api/projects/:id/deploy/:deployId/redeploy
 */
export const redeployDeployment = async (req, res) => {
  try {
    const { id: projectId, deployId } = req.params;
    const userId = req.user?._id;

    const newDeployment = await deploymentService.redeploy(projectId, deployId, userId);
    res.status(202).json({
      success: true,
      deployment: newDeployment,
      message: "Redeployment initiated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a deployment
 * @route DELETE /api/projects/:id/deploy/:deployId
 */
export const deleteDeployment = async (req, res) => {
  try {
    const { id: projectId, deployId } = req.params;
    const result = await deploymentService.deleteDeployment(projectId, deployId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Stop deployment
 * @route POST /api/projects/:id/deploy/:deployId/stop
 */
export const stopDeployment = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: "Stop command accepted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const serveDeployedSite = async (req, res) => {
  try {
    const { id: projectId, deployId } = req.params;
    // req.path is relative to the mounted /:deployId/site route
    const subpath = req.path || "/";
    await deploymentService.serveDeployedFile(projectId, deployId, subpath, res);
  } catch (error) {
    res.status(500).send(`Error serving deployed site: ${error.message}`);
  }
};
