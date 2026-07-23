import { Router } from "express";
import {
  getVideoInfo,
  downloadVideo,
  checkJobStatus,
  getDownloadFile,
} from "../controllers/video.controller.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = Router();

// Existing endpoints
router.post("/video-info", asyncHandler(getVideoInfo));
router.post("/download", asyncHandler(downloadVideo));

// NEW: Status & download endpoints
router.get("/job/:jobId", asyncHandler(checkJobStatus));
router.get("/job/:jobId/download", asyncHandler(getDownloadFile));

export default router;