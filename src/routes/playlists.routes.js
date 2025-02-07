import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  addVideoToPlayList,
  createPlaylist,
  deletePlaylist,
  getMyPlaylists,
  getPlaylistVideos,
  removeVideoOfPlaylist,
} from "../controllers/playlist.controllers.js";

const router = Router();

// ROUTES
router.route("/create").post(verifyJWT, createPlaylist);
router.route("/delete/:playlistId").delete(verifyJWT, deletePlaylist);
router.route("/add/:playlistId/:videoId").patch(verifyJWT, addVideoToPlayList);
router.route("/remove/:playlistId/:videoId").patch(verifyJWT, removeVideoOfPlaylist);
router.route("/my-playlists").get(verifyJWT, getMyPlaylists);
router.route("/:playlistId/videos").get(verifyJWT, getPlaylistVideos);

export default router;
