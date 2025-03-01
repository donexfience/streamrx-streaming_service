import { IChannelSubscriptionRepository } from "../../../application/interface/query/IChannelSubscriptionRepository";
import ChannelSubscription, {
  ChannelSubscription as ChannelSubscriptionType,
} from "../../models/query/subscription";
import { Types } from "mongoose";

export class ChannelSubscriptionRepository
  implements IChannelSubscriptionRepository
{
  async subscribe(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionType> {
    console.log("callling the subscribe for activation");
    return await ChannelSubscription.findOneAndUpdate(
      { userId, channelId },
      { status: "active" },
      { upsert: true, new: true }
    );
  }

  async getChannelSubscriptionBychannelUserId(
    channelId: string,
    userId: string
  ): Promise<ChannelSubscriptionType | null> {
    console.log("Original IDs:", { channelId, userId });

    const channelObjId = Types.ObjectId.isValid(channelId)
      ? new Types.ObjectId(channelId)
      : channelId;
    const userObjId = Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : userId;

    console.log("Converted IDs:", {
      channelObjId: channelObjId.toString(),
      userObjId: userObjId.toString(),
    });

    const subscription = await ChannelSubscription.findOne({
      channelId: channelObjId,
      userId: userObjId,
      status: "active",
    }).lean();

    console.log("Query result:", subscription);

    console.log("Executed query:", {
      channelId: channelObjId,
      userId: userObjId,
      status: "active",
    });

    return subscription;
  }

  async unsubscribe(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionType> {
    console.log("callling the subscribe for deaactivation");

    const result = await ChannelSubscription.findOneAndUpdate(
      { userId, channelId },
      { status: "cancelled" },
      { new: true }
    );
    if (!result) {
      throw new Error("Subscription not found");
    }
    return result;
  }

  async getSubscriptionStatus(
    userId: string,
    channelId: string
  ): Promise<boolean> {
    try {
      const channelSubscription = await ChannelSubscription.findOne({
        userId,
        channelId,
      }).sort({ updatedAt: -1 });
      console.log({
        foundSubscription: !!channelSubscription,
        status: channelSubscription?.status,
        isActive: channelSubscription?.status === "active",
      });
      return channelSubscription?.status === "active" || false;
    } catch (error) {
      console.error("Error checking subscription status:", error);
      return false;
    }
  }

  async getSubscriberCount(channelId: string): Promise<number> {
    return await ChannelSubscription.countDocuments({
      channelId,
      status: "active",
    });
  }

  async getAllsubscribers(channelId: string): Promise<any> {
    try {
      const subscribers = await ChannelSubscription.find({
        channelId,
        status: "active",
      })
        .populate("userId", "username email profileImageURL")
        .sort({ createdAt: -1 })
        .exec();

      return subscribers;
    } catch (error) {
      console.error("Error fetching subscribed users:", error);
      throw new Error("Failed to fetch subscribed users");
    }
  }

  async getSubscriptions(userId: string): Promise<ChannelSubscriptionType[]> {
    return await ChannelSubscription.find({
      userId,
      status: "active",
    }).populate("channelId");
  }
}
