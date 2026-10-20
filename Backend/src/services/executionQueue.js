import { EventEmitter } from "events";
import crypto from "crypto";

/**
 * Lightweight in-process job queue for the cloud execution pipeline.
 * Tracks job lifecycle: pending → running → completed | failed | timeout
 * Emits events for status changes and output streams to notify WebSocket clients.
 */
class ExecutionQueue extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, Object>} */
    this.jobs = new Map();
    this.maxConcurrentJobs = 10;
    this.cleanupIntervalMs = 5 * 60 * 1000; // Purge stale completed jobs after 5 min

    this._cleanupTimer = setInterval(() => this._cleanup(), this.cleanupIntervalMs);
  }

  /**
   * Submit a new job to the queue.
   * @param {Object} options
   * @param {string} options.projectId
   * @param {string} options.type - "run" | "build" | "deploy" | "terminal" | "preview"
   * @param {string} options.command
   * @param {number} [options.timeoutMs=30000]
   * @param {Object} [options.env={}]
   * @param {Object} [options.metadata={}]
   * @returns {{ jobId: string, status: string }}
   */
  enqueue({ projectId, type, command, timeoutMs = 30000, env = {}, metadata = {} }) {
    const jobId = `job_${crypto.randomBytes(8).toString("hex")}`;
    const now = Date.now();

    const job = {
      jobId,
      projectId: String(projectId),
      type,
      command,
      timeoutMs,
      env,
      metadata,
      status: "pending",
      stdout: "",
      stderr: "",
      exitCode: null,
      error: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      _timeoutHandle: null,
    };

    this.jobs.set(jobId, job);

    this.emit("job:enqueued", { jobId, projectId: job.projectId, type });
    this.emit("job:status", { jobId, projectId: job.projectId, status: "pending" });

    return { jobId, status: "pending" };
  }

  /**
   * Mark job as running and arm timeout watchdog.
   */
  markRunning(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "pending") return;

    job.status = "running";
    job.startedAt = Date.now();

    if (job.timeoutMs && job.timeoutMs > 0) {
      job._timeoutHandle = setTimeout(() => {
        this.markTimeout(jobId);
      }, job.timeoutMs);
    }

    this.emit("job:status", { jobId, projectId: job.projectId, status: "running" });
  }

  /**
   * Append stream output (stdout or stderr) to a running job.
   */
  appendOutput(jobId, stream, chunk) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (stream === "stdout") {
      job.stdout += chunk;
    } else {
      job.stderr += chunk;
    }

    this.emit("job:output", {
      jobId,
      projectId: job.projectId,
      stream,
      data: chunk,
    });
  }

  /**
   * Mark job as successfully completed.
   */
  markCompleted(jobId, exitCode = 0, finalOutput = {}) {
    const job = this.jobs.get(jobId);
    if (!job || ["completed", "failed", "timeout"].includes(job.status)) return;

    if (job._timeoutHandle) clearTimeout(job._timeoutHandle);

    job.status = "completed";
    job.exitCode = exitCode;
    job.completedAt = Date.now();

    if (finalOutput.stdout !== undefined) job.stdout = finalOutput.stdout;
    if (finalOutput.stderr !== undefined) job.stderr = finalOutput.stderr;

    this.emit("job:status", {
      jobId,
      projectId: job.projectId,
      status: "completed",
      exitCode,
      durationMs: job.completedAt - (job.startedAt || job.createdAt),
    });
  }

  /**
   * Mark job as failed with error message.
   */
  markFailed(jobId, error, exitCode = 1) {
    const job = this.jobs.get(jobId);
    if (!job || ["completed", "failed", "timeout"].includes(job.status)) return;

    if (job._timeoutHandle) clearTimeout(job._timeoutHandle);

    job.status = "failed";
    job.error = typeof error === "string" ? error : error?.message || "Execution failed";
    job.exitCode = exitCode;
    job.completedAt = Date.now();

    this.emit("job:status", {
      jobId,
      projectId: job.projectId,
      status: "failed",
      error: job.error,
      exitCode,
    });
  }

  /**
   * Mark job as timed out.
   */
  markTimeout(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || ["completed", "failed", "timeout"].includes(job.status)) return;

    job.status = "timeout";
    job.error = `Execution timed out after ${job.timeoutMs}ms`;
    job.exitCode = 124;
    job.completedAt = Date.now();

    this.emit("job:timeout", { jobId, projectId: job.projectId });
    this.emit("job:status", {
      jobId,
      projectId: job.projectId,
      status: "timeout",
      error: job.error,
      exitCode: 124,
    });
  }

  /**
   * Cancel/stop a running or pending job.
   */
  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || ["completed", "failed", "timeout"].includes(job.status)) return false;

    if (job._timeoutHandle) clearTimeout(job._timeoutHandle);

    job.status = "failed";
    job.error = "Job cancelled by user";
    job.exitCode = 130;
    job.completedAt = Date.now();

    this.emit("job:status", {
      jobId,
      projectId: job.projectId,
      status: "failed",
      error: job.error,
      exitCode: 130,
    });
    return true;
  }

  /**
   * Get job by ID.
   */
  getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const { _timeoutHandle, ...cleanJob } = job;
    return cleanJob;
  }

  /**
   * Get all jobs for a specific project.
   */
  getJobsForProject(projectId) {
    const result = [];
    const pId = String(projectId);
    for (const job of this.jobs.values()) {
      if (job.projectId === pId) {
        const { _timeoutHandle, ...cleanJob } = job;
        result.push(cleanJob);
      }
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Cleanup old completed/failed jobs older than 10 minutes.
   */
  _cleanup() {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [id, job] of this.jobs.entries()) {
      if (["completed", "failed", "timeout"].includes(job.status) && job.completedAt && job.completedAt < cutoff) {
        this.jobs.delete(id);
      }
    }
  }

  destroy() {
    if (this._cleanupTimer) clearInterval(this._cleanupTimer);
    for (const job of this.jobs.values()) {
      if (job._timeoutHandle) clearTimeout(job._timeoutHandle);
    }
    this.jobs.clear();
  }
}

export const executionQueue = new ExecutionQueue();
export default executionQueue;
