import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { singUpUser } from "../controllers/user.controllers.js";

const router = Router();

router.route("/singup").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  singUpUser
);

export default router;
