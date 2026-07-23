import { promises as fs } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import os from "os";

const TEMP_DIR = join(os.tmpdir(), "yt-downloads");

async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create temp directory:", err);
  }
}

ensureTempDir();

export function getTempOutputTemplate() {
  return join(
    TEMP_DIR,
    `${randomUUID()}.%(ext)s`
  );
}

export async function cleanupTempFile(filepath) {
  try {
    await fs.unlink(filepath);
    console.log(`Cleaned up: ${filepath}`);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`Failed to cleanup ${filepath}:`, err);
    }
  }
}

export function getTempDir() {
  return TEMP_DIR;
}