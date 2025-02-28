import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ChannelModel } from "./channel";

@Entity("videos")
export class VideoModel {
  @Column({ primary: true })
  id: string;

  @ManyToOne(() => ChannelModel, (channel) => channel.id, { nullable: false })
  @JoinColumn({ name: "channel_id" })
  channel: ChannelModel;

  @Column({ name: "channel_id", type: "string", nullable: false })
  channelId: string;

  @Column({ type: "varchar", nullable: false })
  title: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ name: "presigned_url", type: "varchar", nullable: true })
  presignedUrl?: string;

  @Column({ name: "presigned_url_expiry", type: "timestamp", nullable: true })
  presignedUrlExpiry?: Date;

  @Column({
    type: "varchar",
    enum: ["pending", "processing", "ready", "failed"],
    default: "pending",
  })
  status: "pending" | "processing" | "ready" | "failed";

  @Column({ name: "processing_progress", type: "integer", default: 0 })
  processingProgress: number;

  @Column({ name: "processing_error", type: "text", nullable: true })
  processingError?: string;

  @Column("jsonb", { nullable: true })
  metadata?: {
    originalFileName: string;
    mimeType: string;
    codec: string;
    fps: number;
    duration: number;
  };

  @Column("jsonb", { nullable: false })
  qualities: {
    resolution: string;
    bitrate: string;
    size: number;
    url: string;
    s3Key: string;
  }[];

  @Column({ name: "default_quality", type: "varchar", default: "720p" })
  defaultQuality: string;

  @Column("jsonb", {
    default: {
      viewCount: 0,
      likeCount: 0,
      dislikeCount: 0,
      commentCount: 0,
      averageWatchDuration: 0,
      completionRate: 0,
    },
  })
  engagement: {
    viewCount: number;
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    averageWatchDuration: number;
    completionRate: number;
  };

  @Column({ name: "thumbnail_url", type: "varchar", nullable: true })
  thumbnailUrl?: string;

  @Column({
    type: "varchar",
    enum: ["public", "private", "unlisted"],
    default: "private",
  })
  visibility: "public" | "private" | "unlisted";

  @Column("varchar", { array: true, nullable: true })
  category: string[];

  @Column("varchar", { array: true, nullable: true })
  tags: string[];

  @Column("varchar", { array: true, nullable: true })
  selectedPlaylist: string[];

  @Column({
    name: "video_type",
    type: "varchar",
    enum: ["normal", "short"],
    default: "normal",
  })
  videoType: "normal" | "short";

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
