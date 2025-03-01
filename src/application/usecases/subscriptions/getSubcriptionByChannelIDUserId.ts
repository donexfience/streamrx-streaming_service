import { ChannelSubscriptionEntity } from "../../../domain/entities/subscription";
import { IChannelSubscriptionRepository } from "../../interface/IChannelSubscriptionRepostiory";

export class GetChannelSubscriptionByChannelUserId {
  constructor(private subscriptionRepository: IChannelSubscriptionRepository) {}

  async execute(
    channelId: string,
    userId: string
  ): Promise<ChannelSubscriptionEntity | null> {
    try {
      return await this.subscriptionRepository.getChannelSubscriptionByChannelUserId(
        channelId,
        userId
      );
    } catch (error) {
      console.error(
        "Error in GetChannelSubscriptionByChannelUserId use case:",
        error
      );
      throw error;
    }
  }
}
