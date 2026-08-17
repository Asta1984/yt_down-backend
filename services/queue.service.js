import { Queue, Worker } from "bullmq";
import { processDownloadJob } from "./worker.js";

// BullMQ works best with a plain connection config rather than a shared
// ioredis instance — it manages its own connections internally and avoids
// the race condition where the worker starts before Redis is reachable.
function getRedisConnection() {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  return {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

const connection = getRedisConnection();

export const downloadQueue = new Queue("video-downloads", {
  connection,
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
  connection,
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

  const progress = typeof job.progress === 'number' ? job.progress : 0
  console.log(`[Status ${jobId}] state=${state} progress=${progress}`)      // ← add this
  return {
    success: true,
    jobId: job.id,
    status: state,
    progress,
    data: job.data,
    result: job.returnvalue,
  };
}