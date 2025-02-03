import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadToCloudinary = async (localFilePath, folder, resourceType) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
      resource_type: resourceType,
    });
    console.log("File uploaded on Cloudinary. File src: " + response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.log("Error uploading on Cloudinary", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};
const deleteOfCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error("Error deleting file from Cloudinary: ", error);
    return null;
  }
};

export { uploadToCloudinary, deleteOfCloudinary };
