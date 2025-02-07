import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
  {
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
    },
    visibility: {
      type: String,
      enum: ["Public", "Private", "Unlisted"],
      default: "Private",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
