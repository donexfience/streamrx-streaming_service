import { ChannelSubscriptionEntity } from "../../../domain/entities/subscription";
import { IChannelRepository } from "../../interface/IChannelRepository";
import { IChannelSubscriptionRepository } from "../../interface/IChannelSubscriptionRepository";

export class UnsubscribeFromChannel {
  constructor(
    private subscriptionRepository: IChannelSubscriptionRepository,
    private channelRepository: IChannelRepository
  ) {}

  async execute(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionEntity> {
    try {
      await this.channelRepository.unsubscribe(channelId);
      return await this.subscriptionRepository.unsubscribe(userId, channelId);
    } catch (error) {
      console.error("Error in UnsubscribeFromChannel use case:", error);
      throw error;
    }
  }
}
