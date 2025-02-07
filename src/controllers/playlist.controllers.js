import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.models.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { name, description, visibility } = req.body;
  const { videoId } = req.query; //you can create an empty playlist. So its not strictly required

  //name
  if (!name?.trim()) throw new ApiError(400, "name is required");
  const isNameUsed = await Playlist.findOne({ name: name.trim() });
  if (isNameUsed)
    throw new ApiError(400, "playlist name is in use. Choose a different one");

  if (name.trim().length > 100)
    throw new ApiError(400, "Choose a shorter name");

  //visibility
  if (!visibility?.trim()) throw new ApiError(400, "visibility is required");
  if (
    visibility.trim() !== "Public" &&
    visibility.trim() !== "Private" &&
    visibility.trim() !== "Unlisted"
  ) {
    throw new ApiError(
      400,
      "visibility only can be: Public, Private or Unlisted"
    );
  }

  //video
  let video;
  if (videoId && videoId?.trim()) {
    video = await Video.findById(videoId.trim());
    if (!video || !video.isPublished)
      throw new ApiError(404, "video not found");
  }

  //description
  if (description?.trim().length > 4000)
    throw new ApiError(400, "Description cant be longer than 4000 chars");

  try {
    const playlist = await Playlist.create({
      name: name.trim(),
      visibility: visibility.trim(),
      description: description?.trim() || "",
      videos: video ? [videoId] : [],
      owner: user._id,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(200, { playlist }, `video saved on ${name} playlist`)
      );
  } catch (error) {
    throw new ApiError(500, "Error creating the playlist");
  }
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { playlistId } = req.params;
  if (!playlistId?.trim()) throw new ApiError(400, "playlistId is required");
  const playlist = await Playlist.findById(playlistId.trim());
  if (!playlist) throw new ApiError(404, "playlist not found");

  if (playlist.owner.toString() !== user._id.toString()) {
    throw new ApiError(
      400,
      "Unauthorized. Only the owner of the playlist can delete it"
    );
  }

  try {
    const playlistName = playlist.name.trim();
    await Playlist.findByIdAndDelete(playlist._id);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, `${playlistName} deleted successfully`));
  } catch (error) {
    throw new ApiError(500, "Error deleting the playlist");
  }
});

const addVideoToPlayList = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { videoId, playlistId } = req.params;
  if (!videoId?.trim()) throw new ApiError(400, "videoId parameter is required");
  const video = await Video.findById(videoId.trim());
  if (!video || !video.isPublished) throw new ApiError(404, "video not found");

  if (!playlistId?.trim())
    throw new ApiError(400, "playlistId parameter is required");
  const playlist = await Playlist.findById(playlistId.trim());
  if (!playlist) throw new ApiError(404, "playlist not found");

  if (playlist.owner.toString() !== user._id.toString()) {
    throw new ApiError(
      401,
      "Unauthorized. Only the owner can push videos to the playlist"
    );
  }

  for (const savedVideos of playlist.videos) {
    if (savedVideos._id.toString() === video._id.toString()) {
      throw new ApiError(400, "This video is already on the playlist");
    }
  }

  playlist.videos = playlist.videos.push(video._id);
  try {
    await playlist.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { playlist },
          `video saved on ${playlist.name} playlist`
        )
      );
  } catch (error) {
    throw new ApiError(500, `Error adding the video to the playlist`);
  }
});

const removeVideoOfPlaylist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { videoId, playlistId } = req.params;
  if (!videoId?.trim()) throw new ApiError(400, "videoId parameter is required");
  const video = await Video.findById(videoId.trim());
  if (!video || !video.isPublished) throw new ApiError(404, "video not found");

  if (!playlistId?.trim()) throw new ApiError(400, "playlistId parameter is required");
  const playlist = await Playlist.findById(playlistId.trim());

  if (!playlist) throw new ApiError(404, "playlist not found");

  if (playlist.owner.toString() !== user._id.toString()) {
    throw new ApiError(
      401,
      "Unauthorized. Only the owner of the playlist can remove videos"
    );
  }

  //search video to delete on the playlist
  for (const savedVideo of playlist.videos) {
    if (savedVideo._id.toString() === video._id.toString()) {
      const newPlaylist = playlist.videos.filter(
        (elm) => elm._id.toString() !== savedVideo._id.toString()
      );

      playlist.videos = newPlaylist;

      try {
        await playlist.save({ validateBeforeSave: false });

        return res
          .status(200)
          .json(
            new ApiResponse(200, { playlist }, "video removed of the playlist")
          );
      } catch (error) {
        throw new ApiError(500, "Error removing the video of the playlist");
      }
    }
  }

  throw new ApiError(404, "The video is not inside this playlist");
});

const getMyPlaylists = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const playlists = await Playlist.find({
    owner: user._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { playlists, numberOfPlaylists: playlists.length })
    );
});

const getPlaylistVideos = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { playlistId } = req.params;
  if (!playlistId?.trim())
    throw new ApiError(400, "playlistId parameter is required");
  const playlist = await Playlist.findById(playlistId.trim());
  if (!playlist) throw new ApiError(404, "playlist not found");

  if (playlist.visibility === "Private") {
    if (playlist.owner.toString() !== user._id.toString()) {
      throw new ApiError(404, "playlist not found");
    }
  }

  //Serve the videos
  const videos = await Playlist.aggregate([
    {
      $match: {
        _id: playlist._id,
      },
    },
    { $unwind: "$videos" },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    { $unwind: "$videoDetails" },
    {
      $group: {
        _id: "$_id",
        videos: { $push: "$videoDetails" },
      },
    },
  ]);

  if (!videos.length) {
    throw new ApiError(404, "The playlist is empty");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos: videos[0].videos,
        totalOfVideos: videos[0].videos.length,
      },
      "Playlist videos retrieved successfully"
    )
  );
});

export {
  createPlaylist,
  deletePlaylist,
  addVideoToPlayList,
  removeVideoOfPlaylist,
  getMyPlaylists,
  getPlaylistVideos,
};
