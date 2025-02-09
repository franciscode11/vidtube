import { Router } from "express";
import {
  checkFileSize,
  imageUpload,
  upload,
} from "../middlewares/multer.middlewares.js";
import {
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
} from "../controllers/user.controllers.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

//Not secure routes: Anyone can access to them
router.route("/singup").post(
  imageUpload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  checkFileSize,
  singUpUser
);
router.route("/login").post(loginUser);

router.route("/refresh-tokens").post(refreshUserTokens);

router.route("/channel/:username").get(getUserChannelProfile);

//Secure routes:
router.route("/logout").post(verifyJWT, logOutUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/get-current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account-details").patch(verifyJWT, updateAccountDetails);
router.route("/update-username").patch(verifyJWT, updateUsername);
router
  .route("/update-avatar")
  .patch(
    verifyJWT,
    imageUpload.single("avatar"),
    checkFileSize,
    updateUserAvatar
  );

router
  .route("/update-cover-image")
  .patch(
    verifyJWT,
    imageUpload.single("coverImage"),
    checkFileSize,
    uploadUserCoverImage
  );

export default router;
