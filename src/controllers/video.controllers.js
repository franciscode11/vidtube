import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { uploadToCloudinary, deleteOfCloudinary } from "../utils/cloudinary.js";
import { Like } from "../models/like.models.js";

const createNewVideo = asyncHandler(async (req, res) => {
  const videoLocalPath = req.files?.video?.[0]?.path;
  const thumbnailImageLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) {
    if (thumbnailImageLocalPath) fs.unlinkSync(thumbnailImageLocalPath);
    throw new ApiError(400, "No video file uploaded");
  }

  if (!thumbnailImageLocalPath) {
    if (videoLocalPath) fs.unlinkSync(videoLocalPath);
    throw new ApiError(400, "No video thumbnail uploaded");
  }

  const owner = await User.findById(req.user?._id);
  if (!owner) {
    if (videoLocalPath) fs.unlinkSync(videoLocalPath);
    if (thumbnailImageLocalPath) fs.unlinkSync(thumbnailImageLocalPath);
    throw new ApiError(401, "Unauthorized");
  }

  const { title, description } = req.body;

  if (!title || !description) {
    if (videoLocalPath) fs.unlinkSync(videoLocalPath);
    if (thumbnailImageLocalPath) fs.unlinkSync(thumbnailImageLocalPath);
  }

  if (!title && !description) {
    throw new ApiError(400, "All fields are required");
  }

  if (!title) {
    throw new ApiError(400, "Title field is required");
  }
  if (!description) {
    throw new ApiError(400, "Description field is required");
  }

  //TODO: Compress the video before uploading to Cloudinary

  //upload video to Cloudinary
  console.log("Uploading the video to Cloudinary...");
  const video = await uploadToCloudinary(
    videoLocalPath,
    process.env.CLOUDINARY_VIDEOS_FOLDER_NAME,
    "video"
  );

  if (!video) {
    if (videoLocalPath) fs.unlinkSync(videoLocalPath);
    if (thumbnailImageLocalPath) fs.unlinkSync(thumbnailImageLocalPath);
    throw new ApiError(500, "Error uploading the video on Cloudinary");
  }

  //Upload thumbnail to Cloudinary
  console.log("Uploading the thumbnail image on Cloudinary...");
  const videoThumbnail = await uploadToCloudinary(
    thumbnailImageLocalPath,
    process.env.CLOUDINARY_THUMBNAIL_FOLDER_NAME,
    "image"
  );

  if (!videoThumbnail) {
    if (thumbnailImageLocalPath) fs.unlinkSync(thumbnailImageLocalPath);
    const response = await deleteOfCloudinary(video.public_id);

    if (!response) {
      console.log(
        `Error deleting video of Cloudinary. PublicID: ${video.public_id}`
      );
    } else {
      console.log("Video deleted of Cloudinary", response);
    }
    throw new ApiError(500, "Error uploading the thumbnail of Cloudinary");
  }

  //create video in db
  try {
    const newVideo = await Video.create({
      owner: owner._id,
      videoFile: video.url,
      thumbnail: videoThumbnail.url,
      title: title,
      description: description,
    });
    console.log("New video created successfully!", newVideo);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { newVideo }, "New video created successfully")
      );
  } catch (error) {
    console.log("Error: ", error);
    //Delete video
    const videoResponse = await deleteOfCloudinary(video.public_id);
    if (!videoResponse) {
      console.log(`Error deleting video with public id ${video.public_id} `);
    } else {
      console.log("Video deleted of Cloudinary", videoResponse);
    }
    //Delete thumbnail
    const thumbnailResponse = await deleteOfCloudinary(
      videoThumbnail.public_id
    );
    if (!thumbnailResponse) {
      console.log(
        `Error deleting thumbnail image with public id ${videoThumbnail.public_id} `
      );
    } else {
      console.log("Thumbnail image deleted of Cloudinary", thumbnailResponse);
    }

    throw new ApiError(500, "Error adding the video to the database");
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  //get the videoId in the params
  const { videoId } = req.params;

  if (videoId?.trim() === "") {
    throw new ApiError(400, "videoId parameter is required");
  }

  //Check valid videoId
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "video not found");

  //Check if the user is the owner of the video
  if (video.owner.toString() !== user._id.toString()) {
    throw new ApiError(
      401,
      "Unauthorized. Only the owner of the video can modified this field"
    );
  }

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { video },
        `The video visibility is ${video.isPublished ? "published" : "hidden"} now`
      )
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (videoId?.trim() === "")
    throw new ApiError(400, "videoId parameter is required");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "video not found");

  return res
    .status(200)
    .json(new ApiResponse(200, { video }, "Video founded successfully!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { videoId } = req.params;
  if (videoId?.trim() === "") {
    throw new ApiError(400, "videoId parameter is required");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "video not found");

  if (video.owner.toString() !== user._id.toString()) {
    throw new ApiError(
      401,
      "Unauthorized. Only the owner of the video can delete it"
    );
  }
  //delete video from cloudinary
  const videoPublicId = video.videoFile.match(
    /\/([^\/]+\/[a-zA-Z0-9]+)\.[a-zA-Z0-9]+$/
  )?.[1];

  if (!videoPublicId) throw new ApiError(500, "video publicId not found");

  await deleteOfCloudinary(videoPublicId);

  // Delete thumbnail file from Cloudinary
  const thumbnailPublicId = video.thumbnail.match(
    /\/v\d+\/(.+?)\.[a-z]+$/
  )?.[1];

  if (!thumbnailPublicId)
    throw new ApiError(500, "thumbnail publicId not found");

  await deleteOfCloudinary(thumbnailPublicId);

  // Delete video document from MongoDB
  try {
    await Video.findByIdAndDelete(videoId);
  } catch (error) {
    throw new ApiError(
      500,
      `Error deleting the video with id: ${videoId} from the db`
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (videoId?.trim() === "" || !videoId)
    throw new ApiError(400, "videoId parameter is required");

  const { title, description } = req.body;
  if (!title && !description)
    throw new ApiError(400, "Modified some field to send the request");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "video not found");

  //Validate permitions
  const user = await User.findById(req.user?._id);
  if (!user || user._id.toString() !== video.owner.toString()) {
    throw new ApiError("Unauthorized");
  }

  let videoIsModified = false;

  if (title) {
    if (video.title !== title.trim() && title.trim() !== "") {
      video.title = title.trim();
      videoIsModified = true;
    }
  }

  if (description) {
    if (video.description !== description && description.trim() !== "") {
      video.description = description.trim();
      videoIsModified = true;
    }
  }

  if (!videoIsModified) throw new ApiError(400, "Nothing was changed");

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { video }, "video details updated successfully")
    );
});

const getAllPublishedVideos = asyncHandler(async (req, res) => {
  //if no pageNumber and no limitofVideos per page, use default values
  const { page = 1, limit = 10 } = req.query;

  const videos = await Video.find({ isPublished: true })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const totalVideos = await Video.countDocuments({ isPublished: true });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        totalPages: Math.ceil(totalVideos / limit),
        currentPage: Number(page),
      },
      "Published videos retrieved successfully"
    )
  );
});

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) throw new ApiError(400, "videoId query is required");

  const video = await Video.findById(videoId);
  if (!video || !video.isPublished) throw new ApiError(404, "video not found");

  //find all the comments where video: videoId
  const comments = await Comment.find({ video: video._id });
  let message = "All comments of this video";
  if (comments.length === 0) {
    message = "No comments yet. Be the first";
  }
  return res.status(200).json(new ApiResponse(200, { comments }, message));
});

const getVideoLikes = asyncHandler(async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) throw new ApiError(400, "videoId query is required");
  const video = await Video.findById(videoId);
  if (!video || !video.isPublished) throw new ApiError(404, "video not found");

  const likes = await Like.countDocuments({
    video: video._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { likes }, "video likes served"));
});

export {
  createNewVideo,
  togglePublishStatus,
  getVideoById,
  deleteVideo,
  updateVideoDetails,
  getAllPublishedVideos,
  getVideoComments,
  getVideoLikes,
};
