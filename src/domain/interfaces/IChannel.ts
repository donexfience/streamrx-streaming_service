export interface SocialLink {
  platform: string;
  url: string;
  id: string;
}

export interface StreamSchedule {
  days: string[];
  times: string[];
}

export interface ChannelIntegrations {
  youtube: boolean;
  twitch: boolean;
  discord: boolean;
}

export interface ChannelSocialLinks {
  twitter?: string;
  instagram?: string;
  facebook?: string;
}

export interface IChannel {
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
  email?: string;
  ownerEmail: string;
  schedulePreference?: string;
  subscribersCount: number;
  socialLinks: ChannelSocialLinks;
  streamSchedule: StreamSchedule;
  createdAt?: Date;
  updatedAt?: Date;
}
