import { Router } from "express";

import { getVideoInfo } from "../controllers/video.controller.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = Router();

router.post(
    "/video-info",
    asyncHandler(getVideoInfo)
);

export default router;