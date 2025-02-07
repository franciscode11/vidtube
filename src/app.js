import express from "express";
import { errorHandler } from "./middlewares/error.middlewares.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//MIDDLEWARES
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.json({ limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(errorHandler);

//logger
import logger from "../logger.js";
import morgan from "morgan";
const morganFormat = ":method :url :status :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

//Routes
import healthCheckRouter from "./routes/healthcheck.routes.js";
app.use("/api/v1/healthcheck", healthCheckRouter);

import userRouter from "./routes/users.routes.js";
app.use("/api/v1/users", userRouter);

import videoRouter from "./routes/videos.routes.js";
app.use("/api/v1/videos", videoRouter);

import tweetRouter from "./routes/tweets.routes.js";
app.use("/api/v1/tweets", tweetRouter);

import commentRouter from "./routes/comments.routes.js";
app.use("/api/v1/comments", commentRouter);

import likeRouter from "./routes/likes.routes.js";
app.use("/api/v1/likes", likeRouter);

import playlistRouter from "./routes/playlists.routes.js";
app.use("/api/v1/playlists", playlistRouter);
export { app };
