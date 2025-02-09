import { Router } from "express";
import {
  likeOnVideo,
  likeOnComment,
  likeOnTweet,
} from "../controllers/like.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

//ROUTES
router.route("/video/:videoId").post(verifyJWT, likeOnVideo);
router.route("/comment/:commentId").post(verifyJWT, likeOnComment);
router.route("/tweet/:tweetId").post(verifyJWT, likeOnTweet);

export default router;
