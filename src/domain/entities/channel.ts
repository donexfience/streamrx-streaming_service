import {
  ChannelIntegrations,
  ChannelSocialLinks,
  IChannel,
  StreamSchedule,
} from "../interfaces/IChannel";

export class ChannelEntity implements IChannel {
  id?: string;
  channelName: string;
  description?: string;
  ownerId: string;
  category: string[];
  channelAccessibility: string;
  channelBannerImageUrl?: string;
  channelProfileImageUrl?: string;
  contentType?: string;
  integrations: ChannelIntegrations;
  subscribersCount: number;
  email?: string;
  ownerEmail: string;
  schedulePreference?: string;
  socialLinks: ChannelSocialLinks;
  streamSchedule: StreamSchedule;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: {
    id?: string;
    channelName: string;
    description?: string;
    ownerId: string;
    category: string[];
    channelAccessibility: string;
    channelBannerImageUrl?: string;
    channelProfileImageUrl?: string;
    contentType?: string;
    integrations?: ChannelIntegrations;
    email?: string;
    ownerEmail: string;
    schedulePreference?: string;
    socialLinks?: ChannelSocialLinks;
    streamSchedule?: StreamSchedule;
    createdAt?: Date;
    updatedAt?: Date;
    subscribersCount: number;
  }) {
    this.id = props.id;
    this.channelName = props.channelName;
    this.subscribersCount = props.subscribersCount;
    this.description = props.description;
    this.ownerId = props.ownerId;
    this.category = props.category || [];
    this.channelAccessibility = props.channelAccessibility;
    this.channelBannerImageUrl = props.channelBannerImageUrl || "";
    this.channelProfileImageUrl = props.channelProfileImageUrl || "";
    this.contentType = props.contentType;
    this.integrations = props.integrations || {
      youtube: false,
      twitch: false,
      discord: false,
    };
    this.email = props.email;
    this.ownerEmail = props.ownerEmail;
    this.schedulePreference = props.schedulePreference;
    this.socialLinks = props.socialLinks || {
      twitter: undefined,
      instagram: undefined,
      facebook: undefined,
    };
    this.streamSchedule = props.streamSchedule || {
      days: [],
      times: [],
    };
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }
}
