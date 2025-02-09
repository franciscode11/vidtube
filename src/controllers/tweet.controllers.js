import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content || content.trim() === "")
    throw new ApiError(400, "You can tweet empty...");

  if (content.trim().length > 280)
    throw new ApiError(
      400,
      "Something went wrong, a normal tweet cant be more than 280 chars longer"
    );

  //Validate permitions
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  try {
    const tweet = await Tweet.create({
      owner: user._id,
      content: content,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { tweet }, "New tweet posted successfully"));
  } catch (error) {
    throw new ApiError(500, "Error creating the tweet");
  }
});

const getAllTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const tweets = await Tweet.find().skip((page - 1) * limit);

  const totalTweets = await Tweet.countDocuments();

  const totalPages = Math.ceil(totalTweets / limit);

  if (page > totalPages) throw new ApiError(400, "This page doesnt exist");

  return res.status(200).json(
    new ApiResponse(200, {
      tweets: tweets,
      currentPage: Number(page),
      totalPages: totalPages,
    })
  );
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) throw new ApiError(400, "tweetId parameter is required");

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "tweet not found");

  const user = await User.findById(req.user?._id);
  if (!user || user._id.toString() !== tweet.owner.toString()) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    await Tweet.findByIdAndDelete(tweet._id);
  } catch (error) {
    throw new ApiError(500, "Error deleting the tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

const getTweetLikes = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) throw new ApiError(400, "tweetId query is required");
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "tweet not found");

  const likes = await Like.countDocuments({
    tweet: tweet._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { likes }, "tweet likes served successfully"));
});

export { createTweet, getAllTweets, deleteTweet, getTweetLikes };
