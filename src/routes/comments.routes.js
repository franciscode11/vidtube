import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  createComment,
  deleteComment,
  editComment,
  getCommentById,
  getCommentLikes,
} from "../controllers/comment.controllers.js";

const router = Router();

//ROUTES
router.route("/create/:videoId").post(verifyJWT, createComment);
router.route("/delete/:commentId/:videoId").delete(verifyJWT, deleteComment);
router.route("/edit/:commentId/:videoId").patch(verifyJWT, editComment);
router.route("/get-comment/:commentId/:videoId").get(verifyJWT, getCommentById);
router.route("/get-likes/:commentId").get(getCommentLikes);

export default router;
