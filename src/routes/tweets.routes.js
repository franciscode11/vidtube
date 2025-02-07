import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

import {
  createTweet,
  getAllTweets,
  deleteTweet,
  getTweetLikes,
} from "../controllers/tweet.controllers.js";

const router = Router();

//ROUTES
//not-secure-routes(free-access)
router.route("/get-all-tweets").get(getAllTweets);
router.route("/get-likes").get(getTweetLikes);

//secure-routes(need authentication)
router.route("/create").post(verifyJWT, createTweet);
router.route("/delete/:tweetId").delete(verifyJWT, deleteTweet);
export default router;
