
import { ChannelSubscriptionEntity } from "../../../domain/entities/subscription";
import { IChannelSubscriptionRepository } from "../../interface/IChannelSubscriptionRepository";

export class SubscribeToChannel {
  constructor(private subscriptionRepository: IChannelSubscriptionRepository) {}

  async execute(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionEntity> {
    try {
      return await this.subscriptionRepository.subscribe(userId, channelId);
    } catch (error) {
      console.error("Error in SubscribeToChannel use case:", error);
      throw error;
    }
  }
}
