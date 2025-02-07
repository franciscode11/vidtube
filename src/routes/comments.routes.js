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
router.route("/create").post(verifyJWT, createComment);
router.route("/delete").delete(verifyJWT, deleteComment);
router.route("/edit").patch(verifyJWT, editComment);
router.route("/get-comment").get(verifyJWT, getCommentById);
router.route("/get-likes").get(getCommentLikes);

export default router;
