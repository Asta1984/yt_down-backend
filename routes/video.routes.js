import { Router } from "express";
import progressEmitter from "../utils/progress-emitter.js"
import {
  getVideoInfo,
  downloadVideo,
  checkJobStatus,
  getDownloadFile,
} from "../controllers/video.controller.js";
import asyncHandler from "../middleware/asyncHandler.js";
const router = Router();

router.post("/video-info", asyncHandler(getVideoInfo));
router.post("/download", asyncHandler(downloadVideo));
router.get("/job/:jobId", asyncHandler(checkJobStatus));
router.get("/job/:jobId/download", asyncHandler(getDownloadFile));

// SSE: GET /api/job/:jobId/progress
router.get("/job/:jobId/progress", (req, res) => {
  const { jobId } = req.params;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // flush immediately so browser opens the stream

  // send a heartbeat right away so client knows connection is live
  res.write(`data: ${JSON.stringify({ progress: 0, status: "active" })}\n\n`);

  const onProgress = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);

    // close stream once terminal state reached
    if (payload.status === "completed" || payload.status === "failed") {
      res.end();
      progressEmitter.off(jobId, onProgress);
    }
  };

  progressEmitter.on(jobId, onProgress);

  // client disconnected (tab closed, navigation, etc.)
  req.on("close", () => {
    progressEmitter.off(jobId, onProgress);
  });
});

export default router;

