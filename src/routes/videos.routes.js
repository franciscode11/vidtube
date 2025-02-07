import { Router } from "express";
import { upload, checkFileSize } from "../middlewares/multer.middlewares.js";
import {
  createNewVideo,
  getVideoById,
  togglePublishStatus,
  deleteVideo,
  updateVideoDetails,
  getAllPublishedVideos,
  getVideoComments,
  getVideoLikes,
} from "../controllers/video.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// ROUTES
//not-secure routes(all-access)
router.route("/get/:videoId").get(getVideoById);
router.route("/get-all-videos").get(getAllPublishedVideos);
router.route("/get-video-comments").get(getVideoComments);
router.route("/get-likes").get(getVideoLikes);

//secure-routes(need authentication)
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
router.route("/visibility/:videoId").patch(verifyJWT, togglePublishStatus);
router.route("/delete/:videoId").delete(verifyJWT, deleteVideo);
router.route("/update/:videoId").patch(verifyJWT, updateVideoDetails);

export default router;
