import { Queue, Worker } from "bullmq";
import redis from "../config/redis.js";
import { processDownloadJob } from "./worker.js";

export const downloadQueue = new Queue("video-downloads", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const downloadWorker = new Worker("video-downloads", processDownloadJob, {
  connection: redis,
  concurrency: 4,
});

downloadWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

downloadWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

downloadWorker.on("error", (err) => {
  console.error("Worker error:", err);
});

export async function getJobStatus(jobId) {
  const job = await downloadQueue.getJob(jobId);

  if (!job) {
    return {
      success: false,
      message: "Job not found",
    };
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    success: true,
    jobId: job.id,
    status: state,
    progress,
    data: job.data,
    result: job.returnvalue,
  };
}