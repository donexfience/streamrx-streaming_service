import { IUser, SocialLink } from "../interfaces/Iuser";

export class UserEntity implements IUser {
  id?: string;
  username: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
  phone_number?: string;
  date_of_birth?: string;
  profileImageURL?: string;
  social_links: SocialLink[];
  role: string;
  bio?: string;
  tags: string[];

  constructor(props: {
    id?: string;
    username: string;
    email: string;
    createdAt?: Date;
    updatedAt?: Date;
    phone_number?: string;
    date_of_birth?: string;
    profileImageURL?: string;
    social_links?: SocialLink[];
    role?: string;
    bio?: string;
    tags?: string[];
  }) {
    this.id = props.id;
    this.username = props.username;
    this.email = props.email;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.phone_number = props.phone_number;
    this.date_of_birth = props.date_of_birth;
    this.profileImageURL = props.profileImageURL || "";
    this.social_links = props.social_links || [];
    this.role = props.role || "VIEWER";
    this.bio = props.bio;
    this.tags = props.tags || [];
  }
}
