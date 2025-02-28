import {
    Entity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from "typeorm";
  import { ChannelModel } from "./channel";
  
  @Entity("playlists")
  export class PlaylistModel {
    @Column({ primary: true })
    id: string;
  
    @ManyToOne(() => ChannelModel, (channel) => channel.id, { nullable: false })
    @JoinColumn({ name: "channel_id" })
    channel: ChannelModel;
  
    @Column({ name: "channel_id", type: "string", nullable: false })
    channelId: string;
  
    @Column({ type: "varchar", nullable: false })
    name: string;
  
    @Column({ type: "text", nullable: true })
    description?: string;
  
    @Column({
      type: "varchar",
      enum: ["public", "private", "unlisted"],
      default: "private",
    })
    visibility: "public" | "private" | "unlisted";
  
    @Column({ type: "varchar", nullable: true })
    category?: string;
  
    @Column("varchar", { array: true, nullable: true })
    tags: string[];
  
    @Column({ name: "thumbnail_url", type: "varchar", nullable: true })
    thumbnailUrl?: string;
  
    @Column("jsonb", { nullable: false, default: [] })
    videos: {
      videoId: string;
      next: string | null;
      prev: string | null;
    }[];
  
    @Column({
      type: "varchar",
      enum: ["active", "deleted"],
      default: "active",
    })
    status: "active" | "deleted";
  
    @CreateDateColumn({ name: "created_at" })
    createdAt: Date;
  
    @UpdateDateColumn({ name: "updated_at" })
    updatedAt: Date;
  }