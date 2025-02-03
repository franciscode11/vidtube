import fs from "fs";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import { uploadToCloudinary, deleteOfCloudinary } from "../utils/cloudinary.js";

const createNewVideo = asyncHandler(async (req, res) => {
  const uno = 1;
  if (uno === 1) {
    console.log("req.files", req.files);
    console.log("req.file", req.file);
    throw new ApiError(500, "NADA");
  }

  const videoLocalPath = req.files?.videoFile?.[0]?.path;
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

  const { title, description, duration } = req.body;

  if (!title || !description || !duration) {
    if (videoLocalPath) fs.unlinkSync(videoLocalPath);
    if (thumbnailImageLocalPath) fs.unlinkSync(thumbnailImageLocalPath);
  }

  if (!title && !description && !duration) {
    throw new ApiError(400, "All fields are required");
  }

  if (!title) {
    throw new ApiError(400, "Title field is required");
  }
  if (!description) {
    throw new ApiError(400, "Description field is required");
  }
  if (!duration) {
    throw new ApiError(400, "Duration field is required");
  }

  let video;
  try {
    console.log("Uploading the video to Cloudinary...");
    video = await uploadVideoOnCloudinary(videoLocalPath);
    console.log("Video uploaded successfully on Cloudinary");
  } catch (error) {
    if (videoLocalPath) fs.unlinkSync(videoLocalPath);
    if (thumbnailImageLocalPath) fs.unlinkSync(thumbnailImageLocalPath);
    throw new ApiError(500, "Error uploading thumbnail image on Cloudinary");
  }

  let videoThumbnail;
  try {
    console.log("Uploading the thumbnail image on Cloudinary...");
    videoThumbnail = await uploadImageOnCloudinary(thumbnailImageLocalPath);
    console.log("Thumbnail image uploaded successfully on Cloudinary");
  } catch (error) {
    if (thumbnailImageLocalPath) fs.unlinkSync(thumbnailImageLocalPath);
    const response = await deleteVideoFromCloudinary(video.public_id);
    console.log("Video deleted from Cloudinary");
    throw new ApiError(500, "Error uploading video on Cloudinary");
  }

  if (!video?.url || !videoThumbnail?.url) {
    //Delete video
    try {
      const videoResponse = await deleteVideoFromCloudinary(video.public_id);
      console.log("Video deleted from Cloudinary", videoResponse);
    } catch (error) {
      console.log(`Error deleting video with public id ${video.public_id} `);
    }
    //delete thumbnail
    try {
      const thumbnailResponse = await deleteImageFromCloudinary(
        videoThumbnail.public_id
      );
      console.log("thumbnail image deleted from Cloudinary", thumbnailResponse);
    } catch (error) {
      console.log(
        `Error deleting thumbnail image with public id ${videoThumbnail.public_id} `
      );
    }

    throw new ApiError(500, "Something went uploading the files");
  }

  //create video in db
  try {
    const newVideo = await Video.create({
      owner: mongoose.Types.ObjectId(owner._id),
      videoFile: video?.url,
      thumbnail: videoThumbnail?.url,
      title: title,
      description: description,
      duration: duration,
    });
    console.log("new video created successfully!", newVideo);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { newVideo }, "New video created successfully")
      );
  } catch (error) {
    //Delete video
    try {
      const videoResponse = await deleteVideoFromCloudinary(video.public_id);
      console.log("Video deleted from Cloudinary", videoResponse);
    } catch (error) {
      console.log(`Error deleting video with public id ${video.public_id} `);
    }
    //Delete thumbnail
    try {
      const thumbnailResponse = await deleteImageFromCloudinary(
        videoThumbnail.public_id
      );
      console.log("thumbnail image deleted from Cloudinary", thumbnailResponse);
    } catch (error) {
      console.log(
        `Error deleting thumbnail image with public id ${videoThumbnail.public_id} `
      );
    }

    throw new ApiError(500, "Error creating the video");
  }
});

export { createNewVideo };
