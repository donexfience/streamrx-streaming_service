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

@Entity("channels")
export class ChannelModel {
  @Column({ primary: true })
  id: string;

  @Column({ name: "channel_name", type: "varchar", nullable: false })
  channelName: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @ManyToOne(() => UserModel, (user) => user.id, { nullable: false })
  @JoinColumn({ name: "owner_id" })
  owner: UserModel;

  @Column({ name: "owner_id", type: "integer", nullable: false })
  ownerId: string;

  @Column("varchar", { array: true, nullable: false })
  category: string[];

  @Column({ name: "channel_accessibility", type: "varchar", nullable: false })
  channelAccessibility: string;

  @Column({ name: "channel_banner_image_url", type: "varchar", nullable: true })
  channelBannerImageUrl?: string;

  @Column({
    name: "channel_profile_image_url",
    type: "varchar",
    nullable: true,
  })
  channelProfileImageUrl?: string;

  @Column({ name: "content_type", type: "varchar", nullable: true })
  contentType?: string;

  @Column({ name: "subscribers_count", type: "integer", default: 0 })
  subscribersCount: number;

  @Column("jsonb", {
    default: { youtube: false, twitch: false, discord: false },
    nullable: false,
  })
  integrations: {
    youtube: boolean;
    twitch: boolean;
    discord: boolean;
  };

  @Column({ type: "varchar", nullable: true })
  email?: string;

  @Column({ name: "owner_email", type: "varchar", nullable: false })
  ownerEmail: string;

  @Column({ name: "schedule_preference", type: "varchar", nullable: true })
  schedulePreference?: string;

  @Column("jsonb", {
    default: { twitter: null, instagram: null, facebook: null },
    nullable: true,
  })
  socialLinks: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };

  @Column("jsonb", {
    default: { days: [], times: [] },
    nullable: false,
  })
  streamSchedule: {
    days: string[];
    times: string[];
  };

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
