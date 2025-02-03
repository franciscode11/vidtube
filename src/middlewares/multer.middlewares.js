import multer from "multer";
import path from "path";
import fs from "fs";
import { ApiError } from "../utils/ApiError.js";

//IMAGES
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.IMAGES_FOLDER);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else if (
    file.fieldname === "avatar" ||
    file.fieldname === "coverImage" ||
    file.fieldname === "thumbnail"
  ) {
    cb(
      new ApiError(
        400,
        `${file.fieldname} field only allows an image (jpeg, jpg, png)`
      ),
      false
    );
  } else {
    cb(new ApiError(400, "Only images are allowed (jpeg, jpg, png)"), false);
  }
};

//used to upload images only
const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 1024 * 1024 * 10 },
});

//VIDEOS
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.VIDEOS_FOLDER);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|avi|mov|mkv/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else if (file.fieldname === "video") {
    cb(
      new ApiError(400, "The video field only allows (mp4, avi, mov, mkv)"),
      false
    );
  } else {
    cb(
      new ApiError(400, "Only video files are allowed (mp4, avi, mov, mkv)"),
      false
    );
  }
};

//used to upload videos only
const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 1024 * 1024 * 300 },
});

//UPLOAD MULTIPLE FILES

const dynamicFileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png/;
  const videoTypes = /mp4|avi|mov|mkv/;
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  if (
    (imageTypes.test(extname) &&
      imageTypes.test(mimetype) &&
      file.fieldname !== "video") ||
    file.fieldname === "thumbnail"
  ) {
    imageFileFilter(req, file, cb);
  } else if (
    (videoTypes.test(extname) &&
      videoTypes.test(mimetype) &&
      file.fieldname !== "thumbnail") ||
    file.fieldname === "video"
  ) {
    videoFileFilter(req, file, cb);
  } else {
    cb(new ApiError(400, "Unsupported file type"));
  }
};

const combinedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, process.env.IMAGES_FOLDER);
    } else if (file.mimetype.startsWith("video/")) {
      cb(null, process.env.VIDEOS_FOLDER);
    } else {
      cb(new ApiError(400, "Unsupported file type"));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

//used to upload multiple files. (Images and video)
const upload = multer({
  storage: combinedStorage,
  fileFilter: dynamicFileFilter,
  limits: { fileSize: 1024 * 1024 * 300 },
});

// MIDDLEWARE
//checks file size
const checkFileSize = (req, res, next) => {
  const files = req.files || (req.file ? { file: [req.file] } : {});
  for (const field in files) {
    files[field].forEach((file) => {
      if (file.mimetype.startsWith("image/") && file.size > 1024 * 1024 * 10) {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`Failed to delete file: ${file.path}`);
        });
        return next(new ApiError(400, "Image file size exceeds 10MB limit"));
      } else if (
        file.mimetype.startsWith("video/") &&
        file.size > 1024 * 1024 * 300
      ) {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`Failed to delete file: ${file.path}`);
        });
        return next(new ApiError(400, "Video file size exceeds 300MB limit"));
      }
      console.log(`File uploaded: ${file.originalname}, Size: ${file.size}`);
    });
  }
  next();
};

export { imageUpload, videoUpload, upload, checkFileSize };
