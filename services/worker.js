import { spawn } from "child_process";
import { promises as fs } from "fs";
import progressEmitter from "../utils/progress-emitter.js"
import path from "path";
import {
  getTempOutputTemplate,
  cleanupTempFile,
} from "../utils/temp-storage.js";

export async function processDownloadJob(job) {
  const { url, formatId } = job.data;
  let filePath;

  try {
    console.log(`Processing job ${job.id}: ${url}`);
    const outputTemplate = getTempOutputTemplate();

    return await new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      const yt = spawn("yt-dlp", [
        "-f",
        formatId,
        "-o",
        outputTemplate,
        "--no-playlist",
        "--no-part",
        // Progress output
        "--progress",
        "--newline",
        "--progress-template",
        "download:%(progress._percent_str)s",
        // Final filepath
        "--print",
        "after_move:filepath",
        url,
      ]);

      // Capture stdout
      yt.stdout.on("data", (data) => {
        const text = data.toString();
        stdout += text;

        const lines = text.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          // matches " 11.1%" or "100.0%" — no prefix
          const progressMatch = trimmed.match(/^(\d+(?:\.\d+)?)%$/);
          if (progressMatch) {
            const progress = Math.floor(Number(progressMatch[1]));
            console.log(`[Job ${job.id}] progress: ${progress}%`);
            job.updateProgress(progress).catch(err =>
              console.error("Progress update error:", err)
            );
            // emit to SSE listeners
            progressEmitter.emit(job.id, { progress, status: "active" });
          }
        }
      });

      // Log yt-dlp messages
      yt.stderr.on("data", (data) => {
        const text = data.toString();
        stderr += text;
        console.log(`[Job ${job.id}] ${text}`);
      });

      yt.on("error", (err) => {
        reject(
          new Error(
            `Failed to start yt-dlp: ${err.message}`
          )
        );
      });
      yt.on("close", async (code) => {
        if (code !== 0) {
          // emit failure so SSE client doesn't hang
          progressEmitter.emit(job.id, { progress: 0, status: "failed" });
          return reject(new Error(`yt-dlp exited with code ${code}`));
        }

        try {
          const lines = stdout
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            // filter OUT progress lines, keep only the filepath
            .filter(line => !line.match(/^\d+(?:\.\d+)?%$/));

          filePath = lines[lines.length - 1];

          if (!filePath || !filePath.startsWith("/")) {
            throw new Error(`Invalid filepath from yt-dlp: ${filePath}`);
          }

          await new Promise(r => setTimeout(r, 100));
          await fs.stat(filePath);
          await job.updateProgress(100);
          // emit completion so SSE client closes
          progressEmitter.emit(job.id, { progress: 100, status: "completed" });

          resolve({ filePath, filename: path.basename(filePath) });
        } catch (err) {
          progressEmitter.emit(job.id, { progress: 0, status: "failed" });
          reject(err);
        }
      });
      });

      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);

        // Cleanup temp file on error
        if (filePath) {
          await cleanupTempFile(filePath).catch(() => {});
        }

        throw error;
      }
    }