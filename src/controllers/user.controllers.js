import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadToCloudinary, deleteOfCloudinary } from "../utils/cloudinary.js";

import fs from "fs";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const singUpUser = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  const { fullname, username, email, password } = req.body;

  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(400, "All fields are required");
  }

  //check email format
  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@((gmail|yahoo|outlook)\.[a-z]{2,3}(\.[a-z]{2})?)$/;

  if (!emailRegex.test(email)) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(
      400,
      "The email format is incorrect. It must follow this pattern: example@domain.com"
    );
  }

  //Check if user exists
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (user) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(409, "The email or username already has an account");
  }

  if (!avatarLocalPath) {
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadToCloudinary(
    avatarLocalPath,
    process.env.CLOUDINARY_AVATAR_FOLDER_NAME,
    "image"
  );

  if (!avatar) {
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(500, "Error uploading avatar image to Cloudinary");
  }

  let coverImage;
  if (coverImageLocalPath) {
    coverImage = await uploadToCloudinary(
      coverImageLocalPath,
      process.env.CLOUDINARY_COVERIMAGE_FOLDER_NAME,
      "image"
    );
    if (!coverImage) {
      await deleteOfCloudinary(avatar.public_id);
      throw new ApiError(500, "Error uploading coverImage to cloudinary");
    }
  }

  //Create user
  try {
    const newUser = await User.create({
      fullname,
      email,
      password,
      username: username.toLowerCase(),
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(newUser._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      await deleteOfCloudinary(avatar.public_id);
      if (coverImage) await deleteOfCloudinary(coverImage.public_id);

      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, createdUser, "User registered succesfully"));
  } catch (error) {
    await deleteOfCloudinary(avatar.public_id);
    if (coverImage) await deleteOfCloudinary(coverImage.public_id);

    throw new ApiError(500, "Something went wrong while registering the user");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername) {
    throw new ApiError(400, "Email or username field is required");
  }

  if (!password) throw new ApiError(400, "Password field is required");

  // Convert emailOrUsername to lowercase
  const emailOrUsernameLower = emailOrUsername.toLowerCase();

  //check if user exists
  const user = await User.findOne({
    $or: [{ email: emailOrUsernameLower }, { username: emailOrUsernameLower }],
  });

  if (!user) throw new ApiError(404, "User not found");

  //Check the password
  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) throw new ApiError(401, "Invalid user credentials");

  //Generate Access and Refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser },
        "User logged in successfully"
      )
    );
});

const refreshUserTokens = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const decodedToken = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refreshToken");
    }

    if (refreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token expired or already used");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, {}, "User tokens refreshed successfully!"));
  } catch (error) {
    throw new ApiError(500, "Invalid refreshToken");
  }
});

//All the controllers below work with verifyJWT middleware

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword && !newPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (!currentPassword) {
    throw new ApiError(400, "currentPassword field is required");
  }

  if (!newPassword) {
    throw new ApiError(400, "newPassword field is required");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect password. Try again");
  }

  if (currentPassword === newPassword) {
    throw new ApiError(
      400,
      "The new password must be different from the current one"
    );
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "The current user"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "Fullname and Email fields are required");
  }

  if (fullname?.trim() === "" && email?.trim() === "") {
    throw new ApiError(400, "Fullname and Email fields cant be empty");
  }

  if (fullname?.trim() === "") {
    throw new ApiError(400, "Fullname field cant be empty");
  }

  if (email?.trim() === "") {
    throw new ApiError(400, "Email field cant be empty");
  }

  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  //check changes
  if (
    fullname.trim() === user.fullname &&
    email.toLowerCase().trim() === user.email
  ) {
    throw new ApiError(400, "Nothing has been modified!");
  }

  if (fullname.trim() !== user.fullname) {
    user.fullname = fullname.trim();
  }

  if (email.toLowerCase().trim() !== user.email) {
    //check email format
    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@((gmail|yahoo|outlook)\.[a-z]{2,3}(\.[a-z]{2})?)$/;

    if (!emailRegex.test(email)) {
      throw new ApiError(400, "The email format is incorrect");
    }

    //check if email is avaible
    const emailExists = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (emailExists) throw new ApiError(400, "This email is already in use");

    user.email = email.toLowerCase().trim();
  }

  await user.save({ validateBeforeSave: false });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          fullname: user.fullname,
          email: user.email,
        },
      },
      "Account details updated successfully"
    )
  );
});

const updateUsername = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(401, "Unauthorized");

  const { username } = req.body;

  if (!username) throw new ApiError(400, "Username field is required");

  if (username.toLowerCase().trim() === user.username) {
    throw new ApiError(400, "Nothing has changed");
  }

  const usernameExists = await User.findOne({
    username: username.toLowerCase().trim(),
  });

  if (usernameExists) {
    throw new ApiError(400, "Username already in use. Try with other one");
  }

  user.username = username.toLowerCase().trim();

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          username: user.username,
        },
      },
      "Username updated successfully"
    )
  );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const newAvatarLocalPath = req.file?.path;
  if (!newAvatarLocalPath) {
    throw new ApiError(400, "You have to upload an image to update this field");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    if (newAvatarLocalPath) fs.unlinkSync(newAvatarLocalPath);
    throw new ApiError(401, "Unauthorized");
  }

  //find public_id
  const url = user.avatar;
  const regex = /\/v\d+\/([^/]+\/[^/]+)\.[a-z]+$/;
  const match = url.match(regex);
  const publicId = match ? match[1] : null;

  if (publicId === null) {
    if (newAvatarLocalPath) fs.unlinkSync(newAvatarLocalPath);
    throw new ApiError(500, "Error getting the old image publicId");
  }

  const response = await deleteOfCloudinary(publicId);

  if (!response) {
    if (newAvatarLocalPath) fs.unlinkSync(newAvatarLocalPath);
    throw new ApiError(
      500,
      "Error deleting the old avatar image of Cloudinary"
    );
  }

  const newAvatarImage = await uploadToCloudinary(
    newAvatarLocalPath,
    process.env.CLOUDINARY_AVATAR_FOLDER_NAME,
    "image"
  );

  if (!newAvatarImage) {
    throw new ApiError(
      500,
      "Error uploading the new avatar image to cloudinary"
    );
  }

  user.avatar = newAvatarImage.url;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          avatar: user.avatar,
        },
      },
      "Avatar image updated successfully"
    )
  );
});

const uploadUserCoverImage = asyncHandler(async (req, res) => {
  const newCoverImageLocalPath = req.file?.path;
  if (!newCoverImageLocalPath) {
    throw new ApiError(400, "You have to upload an image to update this field");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    if (newCoverImageLocalPath) fs.unlinkSync(newCoverImageLocalPath);
    throw new ApiError(401, "Unauthorized");
  }

  //delete the old coverImage
  if (user.coverImage !== "") {
    const url = user.coverImage;
    const regex = /\/v\d+\/([^/]+\/[^/]+)\.[a-z]+$/;
    const match = url.match(regex);
    const publicId = match ? match[1] : null;

    if (!publicId) {
      if (newCoverImageLocalPath) fs.unlinkSync(newCoverImageLocalPath);
      throw new ApiError(500, `Error getting the old image publicId`);
    }

    const response = await deleteOfCloudinary(publicId);
    if (!response) {
      if (newCoverImageLocalPath) fs.unlinkSync(newCoverImageLocalPath);
      throw new ApiError(
        500,
        `Error deleting the old coverImage of Cloudinary`
      );
    }
  }

  //upload new coverImage to cloudinary
  const newCoverImage = await uploadToCloudinary(
    newCoverImageLocalPath,
    process.env.CLOUDINARY_COVERIMAGE_FOLDER_NAME,
    "image"
  );

  if (!newCoverImage) {
    throw new ApiError(500, "Error uploading new coverImage on Cloudinary");
  }

  user.coverImage = newCoverImage.url;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          coverImage: user.coverImage,
        },
      },
      "CoverImage updated successfully"
    )
  );
});

//Do the other controllers and then come her to put this pipeline on the mongoDB web to understand it. Then export it and use it
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Schema.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

export {
  singUpUser,
  loginUser,
  logOutUser,
  refreshUserTokens,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUsername,
  updateUserAvatar,
  uploadUserCoverImage,
  getUserChannelProfile,
};
