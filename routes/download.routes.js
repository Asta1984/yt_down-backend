import { Router } from "express";
import { downloadQueue } from "../services/queue.service.js";
import { validateUrl } from "../utils/validation.js";

const router = Router();

// POST /api/download — Queue a download
export async function queueDownload(req, res) {
  try {
    const { url, formatId } = req.body;

    // Validate input
    if (!url || !formatId) {
      return res.status(400).json({
        success: false,
        message: "url and formatId are required",
      });
    }

    try {
      validateUrl(url);
    } catch (validationErr) {
      return res.status(validationErr.status).json({
        success: false,
        message: validationErr.message,
      });
    }

    // Add job to queue
    const job = await downloadQueue.add(
      { url, formatId },
      {
        jobId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }
    );

    res.json({
      success: true,
      message: "Download queued",
      jobId: job.id,
      status: "waiting",
    });
  } catch (error) {
    console.error("Queue error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

router.post("/", queueDownload);
export default router;