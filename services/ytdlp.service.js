import { runCommand } from "../utils/exec.js";
import dotenv from "dotenv";

dotenv.config()

const proxyArgs = () =>
  process.env.YTDLP_PROXY ? ["--proxy", process.env.YTDLP_PROXY] : [];

export async function getVideoMetadata(url) {
  const stdout = await runCommand("yt-dlp", [
    "-J",
    "--no-warnings",
    ...proxyArgs(),
    url,
  ]);

  return JSON.parse(stdout);
}