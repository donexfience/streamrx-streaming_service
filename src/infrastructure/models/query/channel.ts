import mongoose, { Types, Schema, Document, ObjectId } from "mongoose";

export interface Channel extends Document {
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  category: string[];
  channelAccessibility: string;
  channelBannerImageUrl?: string;
  channelProfileImageUrl?: string;
  contentType?: string;
  integrations: {
    youtube: boolean;
    twitch: boolean;
    discord: boolean;
  };
  email?: string;
  ownerEmail: string;
  schedulePreference?: string;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  streamSchedule: {
    days: string[];
    times: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema(
  {
    channelName: { type: String, required: true },
    description: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: [String], required: true },
    channelAccessibility: { type: String, required: true },
    channelBannerImageUrl: { type: String },
    channelProfileImageUrl: { type: String },
    contentType: { type: String },
    integrations: {
      youtube: { type: Boolean, required: true },
      twitch: { type: Boolean, required: true },
      discord: { type: Boolean, required: true },
    },
    ownerEmail: { type: String, required: true },
    schedulePreference: { type: String },
    socialLinks: {
      twitter: { type: String },
      instagram: { type: String },
      facebook: { type: String },
    },
    streamSchedule: {
      days: { type: [String], default: [] },
      times: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

export default mongoose.model<Channel>("Channel", ChannelSchema);
