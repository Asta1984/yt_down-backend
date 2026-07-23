import { getVideoMetadata } from "../services/ytdlp.service.js";
import { downloadQueue, getJobStatus } from "../services/queue.service.js";
import { validateUrl } from "../utils/validators.js";

// GET video metadata
export async function getVideoInfo(req, res) {
  const { url } = req.body;

  // Validate URL
  try {
    validateUrl(url);
  } catch (validationErr) {
    const err = new Error(validationErr.message);
    err.status = validationErr.status;
    throw err;
  }

  const data = await getVideoMetadata(url);

  res.json({
    success: true,
    data,
  });
}

// Queue download job (new approach)
export async function downloadVideo(req, res) {
  const { url, formatId } = req.body;

  // Validate inputs
  if (!url || !formatId) {
    const err = new Error("url and formatId are required");
    err.status = 400;
    throw err;
  }

  try {
    validateUrl(url);
  } catch (validationErr) {
    const err = new Error(validationErr.message);
    err.status = validationErr.status;
    throw err;
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
}

// NEW: Check job status
export async function checkJobStatus(req, res) {
  const { jobId } = req.params;

  const status = await getJobStatus(jobId);

  if (!status.success) {
    const err = new Error(status.message);
    err.status = 404;
    throw err;
  }

  res.json(status);
}

// NEW: Download completed file
export async function getDownloadFile(req, res) {
  const { jobId } = req.params;

  const job = await downloadQueue.getJob(jobId);

  if (!job) {
    const err = new Error("Job not found");
    err.status = 404;
    throw err;
  }

  const state = await job.getState();

  if (state !== "completed") {
    const err = new Error(`Job is ${state}, not completed`);
    err.status = 400;
    throw err;
  }

  const { filePath, filename } = job.returnvalue;

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const { createReadStream } = await import("fs");
  const stream = createReadStream(filePath);

  stream.pipe(res);

  stream.on("error", (err) => {
    console.error("Stream error:", err);
    if (!res.headersSent) {
      throw err;
    }
  });

  // Cleanup temp file after download
  res.on("finish", async () => {
    const { cleanupTempFile } = await import("../utils/temp-storage.js");
    await cleanupTempFile(filePath);
  });
}