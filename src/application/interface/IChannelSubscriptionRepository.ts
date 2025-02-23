import { ChannelSubscriptionEntity } from "../../domain/entities/subscription";

export interface IChannelSubscriptionRepository {
  subscribe(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionEntity>;
  getChannelSubscriptionByChannelUserId(
    channelId: string,
    userId: string
  ): Promise<ChannelSubscriptionEntity | null>;
  unsubscribe(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionEntity>;
  getSubscriptionStatus(userId: string, channelId: string): Promise<boolean>;
  getSubscriberCount(channelId: string): Promise<number>;
  getAllSubscribers(channelId: string): Promise<ChannelSubscriptionEntity[]>;
  getSubscriptions(userId: string): Promise<ChannelSubscriptionEntity[]>;
}
