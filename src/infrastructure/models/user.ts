import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { FriendModel } from "./friend";

@Entity("users")
export class UserModel {
  @Column({ primary: true })
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ nullable: true })
  date_of_birth: string;

  @Column({ nullable: true })
  profileImageURL: string;

  @Column("simple-json", { nullable: true })
  social_links: { platform: string; url: string; id: string }[];

  @Column({ default: "VIEWER" })
  role: string;

  @Column({ nullable: true })
  bio: string;

  @Column("simple-array", { nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;


  @OneToMany(() => FriendModel, (friend) => friend.user)
  sentFriendRequests: FriendModel[];

  @OneToMany(() => FriendModel, (friend) => friend.friend)
  receivedFriendRequests: FriendModel[];
}
