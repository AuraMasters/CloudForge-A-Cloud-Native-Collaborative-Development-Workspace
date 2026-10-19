import containerService from "./containerService.js";
import executionQueue from "./executionQueue.js";
import runtimeContainers, { getTimeout } from "./runtimeContainers.js";

/**
 * ExecutionWorker — the worker engine for cloud execution jobs.
 * Listens for enqueued jobs on `executionQueue` and processes them
 * in the isolated runtime container (with safe workspace fallback if Docker daemon is offline).
 */
class ExecutionWorker {
  constructor() {
    this._setupQueueListeners();
  }

  /**
   * Listen for enqueued jobs and process them automatically.
   */
  _setupQueueListeners() {
    executionQueue.on("job:enqueued", async ({ jobId }) => {
      const job = executionQueue.getJob(jobId);
      if (!job) return;
      try {
        await this.executeJob(job);
      } catch (err) {
        executionQueue.markFailed(jobId, err.message);
      }
    });
  }

  /**
   * Execute a job by routing to the appropriate handler.
   * @param {Object} job — job object from the queue
   */
  async executeJob(job) {
    const { jobId, projectId, type, command, env } = job;

    switch (type) {
      case "run":
        return this._executeCommand(jobId, projectId, command, env);
      case "build":
        return this._executeBuild(jobId, projectId, command, env);
      case "deploy":
        return this._executeBuild(jobId, projectId, command, env);
      default:
        return this._executeCommand(jobId, projectId, command, env);
    }
  }

  /**
   * Execute a command inside the project's runtime environment.
   */
  async _executeCommand(jobId, projectId, command, envOverrides = {}) {
    executionQueue.markRunning(jobId);

    try {
      // First ensure project files are synchronized
      await containerService.syncFilesToWorkspace(projectId);

      const job = executionQueue.getJob(jobId);
      const timeoutMs = job?.timeoutMs || 30000;

      const result = await containerService.execCommand(projectId, command, envOverrides, timeoutMs);

      if (result.stdout) {
        executionQueue.appendOutput(jobId, "stdout", result.stdout);
      }
      if (result.stderr) {
        executionQueue.appendOutput(jobId, "stderr", result.stderr);
      }

      if (result.timedOut || result.exitCode === 124) {
        executionQueue.markTimeout(jobId);
      } else if (result.success) {
        executionQueue.markCompleted(jobId, result.exitCode, {
          stdout: result.stdout,
          stderr: result.stderr,
        });
      } else {
        executionQueue.markFailed(
          jobId,
          result.stderr || `Command exited with status code ${result.exitCode}`,
          result.exitCode
        );
      }
    } catch (err) {
      executionQueue.markFailed(jobId, err.message);
    }
  }

  /**
   * Execute a build job inside the project's runtime environment.
   */
  async _executeBuild(jobId, projectId, command, envOverrides = {}) {
    executionQueue.markRunning(jobId);

    try {
      await containerService.syncFilesToWorkspace(projectId);

      const buildCmd = command || "npm run build";
      const result = await containerService.execCommand(projectId, buildCmd, {
        NODE_ENV: "production",
        ...envOverrides,
      });

      if (result.stdout) {
        executionQueue.appendOutput(jobId, "stdout", result.stdout);
      }
      if (result.stderr) {
        executionQueue.appendOutput(jobId, "stderr", result.stderr);
      }

      if (result.success) {
        executionQueue.markCompleted(jobId, result.exitCode, {
          stdout: result.stdout,
          stderr: result.stderr,
        });
      } else {
        executionQueue.markFailed(
          jobId,
          result.stderr || `Build failed with exit code ${result.exitCode}`,
          result.exitCode
        );
      }
    } catch (err) {
      executionQueue.markFailed(jobId, err.message);
    }
  }
}

export const executionWorker = new ExecutionWorker();
export default executionWorker;
