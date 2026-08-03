import { getVideoMetadata } from "../services/ytdlp.service.js";
import { downloadQueue, getJobStatus } from "../services/queue.service.js";
import { validateUrl, sanitizeFilename, validateFormatId} from "../utils/validators.js";
import contentDisposition from "content-disposition";


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
  const { url, formatId, filename, videoTitle } = req.body;
  // Only true for audio-only downloads; sanitize to a strict boolean
  // so nothing but true/false ever reaches the job data.
  const embedThumbnail = req.body.embedThumbnail === true;

  // Validate inputs
  if (!url || !formatId) {
    const err = new Error("url and formatId are required");
    err.status = 400;
    throw err;
  }

  try {
    validateUrl(url);
    validateFormatId(formatId);

  } catch (validationErr) {
    const err = new Error(validationErr.message);
    err.status = validationErr.status;
    throw err;
  }
   // customFilename: explicit user edit takes priority, then video title, then yt-dlp UUID name
  const customFilename = sanitizeFilename(filename) ?? sanitizeFilename(videoTitle) ?? null;
  
  // Add job to queue
  const job = await downloadQueue.add(
  "video-download",          // job name (string)
  { url, formatId, customFilename, embedThumbnail },         // actual data
  { jobId: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}` }
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

  // Safety check: file might already be cleaned up
  const { existsSync } = await import("fs");
  if (!existsSync(filePath)) {
    const err = new Error("File expired or already downloaded, please re-queue");
    err.status = 410; // Gone
    throw err;
  }
   // If a custom filename was supplied, use it for the served name but keep
  // the real extension so the file still opens correctly.
  const { customFilename } = job.data;
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  const servedFilename = customFilename ? `${customFilename}${ext}` : filename;
  console.log("servedFilename:", JSON.stringify(servedFilename));
  // console.log([...servedFilename].map(c => ({
  //   char: c,
  //   code: c.charCodeAt(0)
  // }))
  // );
  res.setHeader("Content-Disposition",contentDisposition(servedFilename));
  res.setHeader("Content-Type", "application/octet-stream");

  const { createReadStream } = await import("fs");
  const stream = createReadStream(filePath);

  stream.pipe(res);

  // CORRECT: Wait for HTTP response to finish sending to client
  res.on("finish", async () => {
    const { cleanupTempFile } = await import("../utils/temp-storage.js");
    await cleanupTempFile(filePath);
  });

  // Client disconnected before finish — cleanup anyway
  res.on("close", async () => {
    if (!res.writableEnded) {
      stream.destroy();
      const { cleanupTempFile } = await import("../utils/temp-storage.js");
      await cleanupTempFile(filePath);
    }
  });

  stream.on("error", (err) => {
    console.error("Stream error:", err);
    // Don't throw — destroys the response. Handle gracefully.
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream file" });
    }
    stream.destroy();
  });
}
