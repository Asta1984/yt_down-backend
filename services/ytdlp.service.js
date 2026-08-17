import { runCommand } from "../utils/exec.js";

export async function getVideoMetadata(url) {
  const stdout = await runCommand("yt-dlp", [
    "-J",
    "--no-warnings",
    "--extractor-args", "youtube:player_client=android",
    url,
  ]);

  return JSON.parse(stdout);
}

