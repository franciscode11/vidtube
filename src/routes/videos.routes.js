import { Router } from "express";
import { upload, checkFileSize } from "../middlewares/multer.middlewares.js";
import { createNewVideo } from "../controllers/video.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// ROUTES
router.route("/create").post(
  verifyJWT,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 1,
    },
  ]),
  checkFileSize,
  createNewVideo
);

export default router;
