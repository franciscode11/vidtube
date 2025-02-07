import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.models.js";
import { User } from "../models/user.models.js";

const subscribeToChannel = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { channelId } = req.params;
  if (!channelId?.trim())
    throw new ApiError(400, "channelId param is required");
  const channel = await User.findById(channelId.trim());
  if (!channel) throw new ApiError(404, "channel not found");

  //Check if the user is trying to subscribe to its own channel
  if (user._id.toString() === channel._id.toString())
    throw new ApiError(
      400,
      "This operation is invalid. You cant be subscribed to your own channel"
    );
  //Check if the subscription already exists
  const isAlreadySubscribed = await Subscription.findOne({
    subscriber: user._id,
    channel: channel._id,
  });

  if (isAlreadySubscribed) {
    throw new ApiError(400, "The user is already subscribe to this channel");
  }

  try {
    const subscription = await Subscription.create({
      subscriber: user._id,
      channel: channel._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { subscription },
          `${user.username} is subscribed to ${channel.username}`
        )
      );
  } catch (error) {
    throw new ApiError(500, "Error subscribing to the channel");
  }
});

const unSubscribeToChannel = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { channelId } = req.params;
  if (!channelId?.trim())
    throw new ApiError(400, "channelId param is required");
  const channel = await User.findById(channelId.trim());
  if (!channel) throw new ApiError(404, "channel not found");

  //Check if the user is trying to unSubscribe to its own channel
  if (user._id.toString() === channel._id.toString())
    throw new ApiError(
      400,
      "This operation is invalid. You cant unsubscribe to your own channel because you cant be subscribed to it"
    );

  //Check if the subscription already exists
  const isAlreadySubscribed = await Subscription.findOne({
    subscriber: user._id,
    channel: channel._id,
  });

  if (!isAlreadySubscribed) {
    throw new ApiError(400, "The user is not subscribed to this channel");
  }

  try {
    await Subscription.findByIdAndDelete(isAlreadySubscribed._id);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          `${user.username} unsubscribed of ${channel.username}`
        )
      );
  } catch (error) {
    throw new ApiError(500, "Error unsubscribing from the channel");
  }
});

const subscriptionsToChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId?.trim())
    throw new ApiError(400, "channelId param is required");
  const channel = await User.findById(channelId.trim());
  if (!channel) throw new ApiError(404, "channel not found");

  const subscriptions = await Subscription.countDocuments({
    channel: channel._id,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscriptions },
        `${channel.username} has ${subscriptions} ${subscriptions === 1 ? `subscriber` : `subscribers`}`
      )
    );
});

export { subscribeToChannel, unSubscribeToChannel, subscriptionsToChannel };
