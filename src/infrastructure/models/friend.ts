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

export enum FriendStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  BLOCKED = "BLOCKED",
}

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
    enum: FriendStatus,
    enumName: "friend_status_enum", 
    default: FriendStatus.PENDING,
  })
  status: FriendStatus;

  @Column({
    type: "enum",
    enum: FriendStatus,
    enumName: "friend_status_enum", 
    nullable: true,
  })
  previousStatus: FriendStatus | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
