import { Router } from "express";
import { getJobStatus, downloadQueue } from "../services/queue.service.js";
import { streamDownloadedFile } from "../services/ytdlp.service.js";
import { cleanupTempFile } from "../utils/temp-storage.js";

const router = Router();

// GET /api/job/:jobId — Check job status
export async function checkJobStatus(req, res) {
  try {
    const { jobId } = req.params;

    const status = await getJobStatus(jobId);

    if (!status.success) {
      return res.status(404).json(status);
    }

    res.json(status);
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// GET /api/job/:jobId/download — Download completed file
export async function downloadCompletedFile(req, res) {
  try {
    const { jobId } = req.params;

    const job = await downloadQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const state = await job.getState();

    if (state !== "completed") {
      return res.status(400).json({
        success: false,
        message: `Job is ${state}, not completed`,
      });
    }

    const { filePath, filename } = job.returnvalue;

    // Stream file
    await streamDownloadedFile(filePath, res, filename);

    // Cleanup after download completes
    res.on("finish", async () => {
      await cleanupTempFile(filePath);
    });
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

router.get("/:jobId", checkJobStatus);
router.get("/:jobId/download", downloadCompletedFile);

export default router;