import mongoose, { Schema, Document } from "mongoose";

export interface SocialLink {
  platform: string;
  url: string;
  id: string;
}

export interface User extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  username?: string;
  phone_number?: string;
  date_of_birth?: string;
  profileImageURL?: string;
  social_links?: SocialLink[];
  role: string;
  bio?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SocialLinkSchema = new Schema({
  platform: { type: String, required: true },
  url: { type: String, required: true },
  id: { type: String, required: true },
});

export const UserSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    phone_number: { type: String },
    date_of_birth: { type: String },
    profileImageURL: { type: String },
    social_links: { type: [SocialLinkSchema], default: [] },
    role: { type: String, default: "VIEWER" },
    bio: { type: String },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<User>("User", UserSchema);
