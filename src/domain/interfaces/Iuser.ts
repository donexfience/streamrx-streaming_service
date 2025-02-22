import { Types } from "mongoose";

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface IUser {
  id?: number;
  username: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
  phone_number?: string;
  date_of_birth?: string;
  profileImageURL?: string;
  social_links?: Array<SocialLink>;
  role?: string;
  bio?: string;
  tags?: string[];
}
