// src/models/InviteModel.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ChannelModel } from "./channel";
import { UserModel } from "./user";

@Entity("invites")
export class InviteModel {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  token: string;

  @ManyToOne(() => ChannelModel, (channel) => channel.id, { nullable: false })
  @JoinColumn({ name: "channel_id" })
  channel: ChannelModel;

  @Column({ name: "channel_id", type: "string", nullable: false })
  channelId: string;

  @ManyToOne(() => UserModel, (user) => user.id, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user: UserModel;

  @Column({ name: "user_id", type: "string", nullable: false })
  userId: string;

  @Column({ type: "timestamp" })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
