import mongoose, { Schema } from "mongoose";

const StreamSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  broadcastType: { type: String, required: true },
  category: { type: String, required: true },
  visibility: { type: String, required: true },
  thumbnail: { type: String },
  fallbackVideo: { type: Map, of: new Schema({ url: String, s3Key: String }) },
  schedule: { dateTime: { type: Date, required: false, default: null } },
  playlistId: { type: String },
  liveChat: {
    enabled: { type: Boolean, default: true },
    replay: { type: Boolean, default: false },
    participantMode: { type: String, default: "Anyone" },
    reactions: { type: Boolean, default: true },
    slowMode: { type: Boolean, default: false },
    slowModeDelay: { type: String, default: "60" },
  },
  channelId: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "scheduled", "started", "stopped", "missed"],
    default: "pending",
  },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
  participants: [
    {
      userId: { type: String, required: true },
      role: { type: String, enum: ["host", "guest"], required: true },
    },
  ],
});

export const StreamMongoModel = mongoose.model("Stream", StreamSchema);
