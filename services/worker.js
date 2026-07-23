import { spawn } from "child_process";
import { promises as fs } from "fs";
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
        "--newline",
        "--progress-template",
        "download:%(progress._percent_str)s",
        // Final filepath
        "--print",
        "after_move:filepath",
        url,
      ]);

      // Capture stdout
      yt.stdout.on("data", async (data) => {
        const text = data.toString();
        stdout += text;

        // Match progress: download:12.5%
        const progressMatch = text.match(
          /download:\s*(\d+(?:\.\d+)?)%/
        );
        if (progressMatch) {
          const progress = Math.floor(
            Number(progressMatch[1])
          );
          try {
            await job.updateProgress(progress);
          } catch (err) {
            console.error("Progress update error:", err);
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
          return reject(
            new Error(
              stderr ||
                `yt-dlp exited with code ${code}`
            )
          );
        }

        try {
          // Get all lines from stdout
          const lines = stdout
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

          // The last line should be the filepath from --print after_move:filepath
          filePath = lines[lines.length - 1];

          if (!filePath) {
            throw new Error(
              "No filepath output from yt-dlp"
            );
          }

          // Validate it looks like a path (starts with / on Mac/Linux)
          if (!filePath.startsWith("/")) {
            throw new Error(
              `Invalid filepath from yt-dlp: ${filePath}`
            );
          }
          // Small delay to ensure file is fully written
          await new Promise((r) => setTimeout(r, 100));

          // Verify file exists
          await fs.stat(filePath);

          await job.updateProgress(100);

          resolve({
            filePath,
            filename: path.basename(filePath),
          });
        } catch (err) {
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