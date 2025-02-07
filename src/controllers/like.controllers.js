import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/like.models.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";

const likeOnVideo = asyncHandler(async (req, res) => {
  //This endpoint toggles the like status. Press -> likes or removes the like
  const user = await User.findById(req.user?._id);
  if (!user)
    throw new ApiError(
      401,
      "Unauthorized. Log in or create an account to like a video"
    );

  const { videoId } = req.query;
  if (!videoId) throw new ApiError(400, "videoId query is required");
  const video = await Video.findById(videoId);
  if (!video || !video.isPublished) throw new ApiError(404, "video not found");

  //check if the video is already liked
  const isAlreadyLiked = await Like.findOne({
    likedBy: user._id,
    video: video._id,
  });

  if (isAlreadyLiked) {
    //remove the like
    try {
      await Like.findByIdAndDelete(isAlreadyLiked._id);
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "The video like was removed"));
    } catch (error) {
      throw new ApiError(500, "Error removing the like of the video");
    }
  }

  try {
    const like = await Like.create({
      likedBy: user._id,
      video: video._id,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { like }, "video liked successfully"));
  } catch (error) {
    throw new ApiError(500, "Error liking the video");
  }
});

const likeOnComment = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { commentId } = req.query;
  if (!commentId) throw new ApiError(400, "commentId query is required");
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "comment not found");

  const isAlreadyLiked = await Like.findOne({
    likedBy: user._id,
    comment: comment._id,
  });

  if (isAlreadyLiked) {
    //remove the like
    try {
      await Like.findByIdAndDelete(isAlreadyLiked._id);
      return res
        .status(200)
        .json(
          new ApiResponse(200, {}, "the comment like was removed successfully")
        );
    } catch (error) {
      throw new ApiError(500, "Error removing the comment like");
    }
  }

  try {
    const like = await Like.create({
      likedBy: user._id,
      comment: comment._id,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { like }, "comment liked successfully"));
  } catch (error) {
    throw new ApiError(500, "Error liking the comment");
  }
});

const likeOnTweet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { tweetId } = req.query;
  if (!tweetId) throw new ApiError(400, "tweetId query is required");
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "tweet not found");

  const isAlreadyLiked = await Like.findOne({
    likedBy: user._id,
    tweet: tweet._id,
  });

  if (isAlreadyLiked) {
    try {
      await Like.findByIdAndDelete(isAlreadyLiked._id);
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "tweet like removed successfully"));
    } catch (error) {
      throw new ApiError(500, "Error removing the tweet like");
    }
  }

  try {
    const like = await Like.create({
      likedBy: user._id,
      tweet: tweet._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, { like }, "tweet liked successfully"));
  } catch (error) {
    throw new ApiError(500, "Error liking the tweet");
  }
});

export { likeOnVideo, likeOnComment, likeOnTweet };
