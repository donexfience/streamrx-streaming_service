import { ChannelSubscriptionEntity } from "../../../domain/entities/subscription";
import { IChannelSubscriptionRepository } from "../../interface/IChannelSubscriptionRepository";

export class UnsubscribeFromChannel {
  constructor(private subscriptionRepository: IChannelSubscriptionRepository) {}

  async execute(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionEntity> {
    try {
      return await this.subscriptionRepository.unsubscribe(userId, channelId);
    } catch (error) {
      console.error("Error in UnsubscribeFromChannel use case:", error);
      throw error;
    }
  }
}
