import { Router } from "express";

const router = Router();

import { healthcheck } from "../controllers/healthcheck.controllers.js";
router.route("/").get(healthcheck);

export default router;
