import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ChannelModel } from "../channel";
import { UserModel } from "../user";

@Entity("streams")
export class StreamModel {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", nullable: false })
  title: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ name: "broadcast_type", type: "varchar", nullable: false })
  broadcastType: string;

  @Column({ type: "varchar", nullable: false })
  category: string;

  @Column({ type: "varchar", nullable: false })
  visibility: string;

  @Column({ type: "varchar", nullable: true })
  thumbnail?: string;

  @Column("jsonb", { nullable: true })
  fallbackVideo?: {
    [key: string]: {
      url: string;
      s3Key: string;
    };
  };

  @Column("jsonb", { nullable: true })
  schedule: {
    dateTime: Date;
  };

  @Column({ name: "playlist_id", type: "varchar", nullable: true })
  playlistId?: string;

  @Column("jsonb", {
    default: {
      enabled: true,
      replay: false,
      participantMode: "Anyone",
      reactions: true,
      slowMode: false,
      slowModeDelay: "60",
    },
    nullable: false,
  })
  liveChat: {
    enabled: boolean;
    replay: boolean;
    participantMode: string;
    reactions: boolean;
    slowMode: boolean;
    slowModeDelay: string;
  };

  @ManyToOne(() => ChannelModel, (channel) => channel.id, { nullable: false })
  @JoinColumn({ name: "channel_id" })
  channel: ChannelModel;

  @Column({ name: "channel_id", type: "string", nullable: false })
  channelId: string;

  @ManyToOne(() => UserModel, (user) => user.id, { nullable: false })
  @JoinColumn({ name: "creator_id" })
  creator: UserModel;

  @Column({ name: "creator_id", type: "string", nullable: false })
  createdBy: string;

  @Column({
    type: "varchar",
    enum: ["pending", "scheduled", "started", "stopped", "missed"],
    default: "pending",
    nullable: false,
  })
  status: "pending" | "scheduled" | "started" | "stopped" | "missed";

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column("jsonb", { nullable: true, default: () => "'[]'" })
  participants: {
    userId: string; 
    role: "host" | "guest";
    username:string
  }[];
}
