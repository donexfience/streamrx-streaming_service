import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserModel } from "./user";

@Entity("friends")
export class FriendModel {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => UserModel, (user) => user.sentFriendRequests)
  @JoinColumn({ name: "user_id" })
  user: UserModel;

  @ManyToOne(() => UserModel, (user) => user.receivedFriendRequests)
  @JoinColumn({ name: "friend_id" })
  friend: UserModel;

  @Column({
    type: "enum",
    enum: ["PENDING", "ACCEPTED", "REJECTED", "BLOCKED"],
    default: "PENDING",
  })
  status: string;

  @Column({
    type: "enum",
    enum: ["PENDING", "ACCEPTED", "REJECTED", "BLOCKED"],
    nullable: true,
  })
  previousStatus: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}