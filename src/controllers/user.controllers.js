import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import {
  uploadImageOnCloudinary,
  deleteImageFromCloudinary,
} from "../utils/cloudinary.js";

import fs from "fs";

const singUpUser = asyncHandler(async (req, res) => {
  //Get the user inputs
  const { fullname, username, email, password } = req.body;
  //Check if the user gives all the inputs
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  //Check if user exists
  console.log("Checking if user exists...");
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (user) {
    console.log("The user already exists!");
    // Delete images from local server
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(409, "The email or username already has an account");
  }

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

  let avatar;
  try {
    console.log("Uploading avatar image to cloudinary...");
    avatar = await uploadImageOnCloudinary(avatarLocalPath);
    console.log("Avatar image uploaded to cloudinary.");
  } catch (error) {
    console.log("Error uploading avatar image to cloudinary");
    throw new ApiError(500, "Error uploading avatar image to cloudinary");
  }

  let coverImage;
  if (coverImageLocalPath) {
    try {
      console.log("Uploading coverImage to cloudinary...");
      coverImage = await uploadImageOnCloudinary(coverImageLocalPath);
      console.log("CoverImage uploaded to cloudinary");
    } catch (error) {
      console.log("Error uploading coverImage to cloudinary");
      throw new ApiError(500, "Error uploading coverImage to cloudinary");
    }
  }

  //Create user in db
  console.log("Creating user in the database...");
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
      console.log("Something went wrong while registering the user");
      //Delete uploaded images at cloudinary
      try {
        const avatarResponse = await deleteImageFromCloudinary(
          avatar.public_id
        );
        let coverImageResponse;
        if (coverImage) {
          coverImageResponse = await deleteImageFromCloudinary(
            coverImage.public_id
          );
        }
        console.log(
          "userFailedCreation images,  deleted from cloudinary :",
          avatarResponse,
          coverImageResponse
        );
      } catch (error) {
        console.log("Error deleting userFailedCreation images: ", error);
      }

      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    console.log("User registered successfully", newUser);
    return res
      .status(200)
      .json(new ApiResponse(200, createdUser, "User registered succesfully"));
  } catch (error) {
    console.log("Error creating user: ", error);
    //Delete uploaded images at cloudinary
    try {
      const avatarResponse = await deleteImageFromCloudinary(avatar.public_id);
      let coverImageResponse;
      if (coverImage) {
        coverImageResponse = await deleteImageFromCloudinary(
          coverImage.public_id
        );
      }
      console.log(
        "userFailedCreation images,  deleted from cloudinary :",
        avatarResponse,
        coverImageResponse
      );
    } catch (error) {
      console.log("Erorr deleting userFailedCreation images: ", error);
    }
    throw new ApiError(500, "Something went wrong while registering the user");
  }
});

export { singUpUser };
