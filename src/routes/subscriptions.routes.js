import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  subscribeToChannel,
  unSubscribeToChannel,
  subscriptionsToChannel,
} from "../controllers/subscription.controllers.js";

const router = Router();

//ROUTES
router.route("/:channelId").get(subscriptionsToChannel);

router.route("/subscribe/:channelId").post(verifyJWT, subscribeToChannel);
router.route("/unsubscribe/:channelId").delete(verifyJWT, unSubscribeToChannel);

export default router;
