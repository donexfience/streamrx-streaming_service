import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { UserModel } from "../../infrastructure/models/user";
import { ChannelModel } from "../../infrastructure/models/channel";

@Entity("channel_subscriptions")
@Unique(["userId", "channelId"])
export class ChannelSubscriptionModel {
  @Column({ primary: true })
  id: string;

  @ManyToOne(() => UserModel, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user: UserModel;

  @Column({ name: "user_id", type: "integer", nullable: false })
  userId: string;

  @ManyToOne(() => ChannelModel, { nullable: false })
  @JoinColumn({ name: "channel_id" })
  channel: ChannelModel;

  @Column({ name: "channel_id", type: "integer", nullable: false })
  channelId: string;

  @Column({ name: "notifications_enabled", type: "boolean", default: true })
  notificationsEnabled: boolean;

  @Column({
    type: "enum",
    enum: ["active", "cancelled"],
    default: "active",
  })
  status: "active" | "cancelled";

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
