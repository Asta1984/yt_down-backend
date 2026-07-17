import { validateUrl } from "../utils/validators.js";
import { getVideoMetadata } from "../services/ytdlp.service.js";

export async function getVideoInfo(req, res) {
    const { url } = req.body;

    validateUrl(url);

    const info = await getVideoMetadata(url);

    res.json({
        success: true,
        data: {
            id: info.id,
            title: info.title,
            duration: info.duration,
            thumbnail: info.thumbnail,
            uploader: info.uploader,
            webpage_url: info.webpage_url,
            formats: info.formats.map((f) => ({
                format_id: f.format_id,
                ext: f.ext,
                format: f.format,
                filesize: f.filesize,
                width: f.width,
                height: f.height,
                fps: f.fps,
                vcodec: f.vcodec,
                acodec: f.acodec,
                url: f.url
            }))
        }
    });
}