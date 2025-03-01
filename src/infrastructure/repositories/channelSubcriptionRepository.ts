import { Repository } from "typeorm";
import { AppDataSource } from "../../config/dbConfig";
import { ChannelSubscriptionModel } from "../models/subscription";
import { ChannelSubscriptionEntity } from "../../domain/entities/subscription";
import { IChannelSubscriptionRepository } from "../../application/interface/IChannelSubscriptionRepostiory";

export class ChannelSubscriptionRepository
  implements IChannelSubscriptionRepository
{
  private subscriptionRepository: Repository<ChannelSubscriptionModel>;

  constructor() {
    this.subscriptionRepository = AppDataSource.getRepository(
      ChannelSubscriptionModel
    );
  }

  async subscribe(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionEntity> {
    console.log("Calling the subscribe for activation");
    const subscriptionData = {
      userId: userId,
      channelId: channelId,
      status: "active" as const,
    };

    let subscription = await this.subscriptionRepository.findOne({
      where: {
        userId: subscriptionData.userId,
        channelId: subscriptionData.channelId,
      },
    });

    if (subscription) {
      subscription.status = "active";
      await this.subscriptionRepository.save(subscription);
    } else {
      subscription = this.subscriptionRepository.create(subscriptionData);
      await this.subscriptionRepository.save(subscription);
    }

    return new ChannelSubscriptionEntity(subscription);
  }

  async getChannelSubscriptionByChannelUserId(
    channelId: string,
    userId: string
  ): Promise<ChannelSubscriptionEntity | null> {
    console.log("Original IDs:", { channelId, userId });

    console.log("Converted IDs:", {
      channelId: channelId,
      userId: userId,
    });

    const subscription = await this.subscriptionRepository.findOne({
      where: { channelId: channelId, userId: userId, status: "active" },
      relations: ["user", "channel"],
    });

    console.log("Query result:", subscription);

    return subscription ? new ChannelSubscriptionEntity(subscription) : null;
  }

  async unsubscribe(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionEntity> {
    console.log("Calling the unsubscribe for deactivation");

    const userIdNum = parseInt(userId);
    const channelIdNum = parseInt(channelId);

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId: userId, channelId: channelId },
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    subscription.status = "cancelled";
    const updatedSubscription = await this.subscriptionRepository.save(
      subscription
    );

    return new ChannelSubscriptionEntity(updatedSubscription);
  }

  async getSubscriptionStatus(
    userId: string,
    channelId: string
  ): Promise<boolean> {
    try {
      const userIdNum = parseInt(userId);
      const channelIdNum = parseInt(channelId);

      const subscription = await this.subscriptionRepository.findOne({
        where: { userId: userId, channelId: channelId },
        order: { updatedAt: "DESC" },
      });

      console.log({
        foundSubscription: !!subscription,
        status: subscription?.status,
        isActive: subscription?.status === "active",
      });

      return subscription?.status === "active" || false;
    } catch (error) {
      console.error("Error checking subscription status:", error);
      return false;
    }
  }

  async getSubscriberCount(channelId: string): Promise<number> {
    const channelIdNum = parseInt(channelId);
    return await this.subscriptionRepository.count({
      where: { channelId: channelId, status: "active" },
    });
  }

  async getAllSubscribers(
    channelId: string
  ): Promise<ChannelSubscriptionEntity[]> {
    try {
      const channelIdNum = parseInt(channelId);
      const subscribers = await this.subscriptionRepository.find({
        where: { channelId: channelId, status: "active" },
        relations: ["user"],
        order: { createdAt: "DESC" },
      });

      return subscribers.map((sub) => new ChannelSubscriptionEntity(sub));
    } catch (error) {
      console.error("Error fetching subscribed users:", error);
      throw new Error("Failed to fetch subscribed users");
    }
  }

  async getSubscriptions(userId: string): Promise<ChannelSubscriptionEntity[]> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { userId: userId, status: "active" },
      relations: ["channel"],
    });

    return subscriptions.map((sub) => new ChannelSubscriptionEntity(sub));
  }
}
