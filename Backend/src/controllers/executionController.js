import executionQueue from "../services/executionQueue.js";
import containerService from "../services/containerService.js";
import portDetectorService from "../services/portDetectorService.js";
import Project from "../models/Project.js";

/**
 * Submit a code run job to the execution queue
 * @route POST /api/projects/:id/execute/run
 */
export const submitRunJob = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { command, timeoutMs = 30000, env = {} } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    let runCommand = command;
    if (!runCommand) {
      const runtime = await containerService.detectProjectRuntime(projectId);
      if (runtime.runtime === "python") {
        runCommand = "python3 main.py";
      } else {
        runCommand = "npm start";
      }
    }

    const { jobId, status } = executionQueue.enqueue({
      projectId,
      type: "run",
      command: runCommand,
      timeoutMs,
      env,
    });

    res.status(202).json({
      success: true,
      jobId,
      status,
      command: runCommand,
      message: "Execution job queued successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Submit a build job to the execution queue
 * @route POST /api/projects/:id/execute/build
 */
export const submitBuildJob = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { command = "npm run build", timeoutMs = 300000, env = {} } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const { jobId, status } = executionQueue.enqueue({
      projectId,
      type: "build",
      command,
      timeoutMs,
      env,
    });

    res.status(202).json({
      success: true,
      jobId,
      status,
      command,
      message: "Build job queued successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get job status and output
 * @route GET /api/projects/:id/execute/status/:jobId
 */
export const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = executionQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Stop/cancel an active job
 * @route POST /api/projects/:id/execute/stop/:jobId
 */
export const stopJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = executionQueue.cancelJob(jobId);

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        message: "Job could not be cancelled (already finished or not found)",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get preview status for the project
 * @route GET /api/projects/:id/execute/preview
 */
export const getPreviewStatus = async (req, res) => {
  try {
    const projectId = req.params.id;
    const info = await portDetectorService.getProjectPreviewInfo(projectId);
    res.status(200).json({ success: true, ...info });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
