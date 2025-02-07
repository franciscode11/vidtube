import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";

const createComment = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { videoId } = req.query;
  if (!videoId || videoId === "")
    throw new ApiError(400, "videoId is required");

  const video = await Video.findById(videoId);
  if (!video || !video.isPublished) throw new ApiError(404, "Video not found");

  const { content } = req.body;
  if (!content)
    throw new ApiError(400, "Comment is empty. Write something to comment");

  if (content.length > 500)
    throw new ApiError(400, "Comments cant be longer than 500 chars");

  try {
    const comment = await Comment.create({
      owner: user._id,
      video: video._id,
      content: content,
    });
    console.log("Comment created successfully");

    return res
      .status(200)
      .json(new ApiResponse(200, { comment }, "Comment created successfully"));
  } catch (error) {
    console.log("Error creating the comment");
    throw new ApiError(500, "Error creating the comment");
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { videoId } = req.query;
  if (!videoId) throw new ApiError(400, "videoId query is required");
  const video = await Video.findById(videoId);
  if (!video || !video.isPublished) throw new ApiError(404, "video not found");

  const { commentId } = req.query;
  if (!commentId) throw new ApiError(400, "commentId query is required");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  if (comment.owner.toString() !== user._id.toString()) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    await Comment.findByIdAndDelete(comment._id);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment deleted successfully"));
  } catch (error) {
    throw new ApiError(500, "Error deleting the comment");
  }
});

const editComment = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(400, "Unauthorized");

  const { videoId, commentId } = req.query;
  if (!videoId) throw new ApiError(400, "videoId query is required");
  if (!commentId) throw new ApiError(400, "commentId query is required");

  const video = await Video.findById(videoId);
  if (!video || !video.isPublished) throw new ApiError(404, "video not found");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "comment not found");

  if (comment.owner.toString() !== user._id.toString()) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { content } = req.body;

  if (!content)
    throw new ApiError(400, "Comment is empty. Write something to comment");

  if (content.trim().length > 500)
    throw new ApiError(400, "Comments cant be longer than 500 chars");

  if (content.trim() === comment.content.trim())
    throw new ApiError(400, "Nothing changed");

  try {
    const editedComment = await Comment.findByIdAndUpdate(
      comment._id,
      {
        $set: {
          content: content.trim(),
        },
      },
      {
        new: true,
      }
    );
    return res.status(200).json(new ApiResponse(200, { editedComment }, ""));
  } catch (error) {
    throw new ApiError(500, "Error editing the comment");
  }
});

const getCommentById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { commentId } = req.query;
  if (!commentId) throw new ApiError(400, "commentId query is required");
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "comment not found");

  if (user._id.toString() !== comment.owner.toString()) {
    throw new ApiError(401, "Unauthorized");
  }

  const { videoId } = req.query;
  if (!videoId) throw new ApiError(400, "videoId query is required");
  const video = await Video.findById(videoId);
  if (!video || !video.isPublished)
    throw new ApiError(
      404,
      "video not found. The video doesnt exist or is hidden"
    );

  return res
    .status(200)
    .json(
      new ApiResponse(200, { comment }, "The comment is retrieved succesfully")
    );
});

const getCommentLikes = asyncHandler(async (req, res) => {
  const { commentId } = req.query;
  if (!commentId) throw new ApiError(400, "commentId query is required");
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "comment not found");

  const likes = await Like.countDocuments({
    comment: comment._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { likes }, "comment likes served succcessfully")
    );
});

export {
  createComment,
  deleteComment,
  editComment,
  getCommentById,
  getCommentLikes,
};
