import { ChannelSubscriptionEntity } from "../../../domain/entities/subscription";
import { IChannelRepository } from "../../interface/IChannelRepository";
import { IChannelSubscriptionRepository } from "../../interface/IChannelSubscriptionRepostiory";

export class SubscribeToChannel {
  constructor(
    private subscriptionRepository: IChannelSubscriptionRepository,
    private channelRepository: IChannelRepository
  ) {}

  async execute(
    userId: string,
    channelId: string
  ): Promise<ChannelSubscriptionEntity> {
    try {
      await this.channelRepository.subscribe(channelId);
      return await this.subscriptionRepository.subscribe(userId, channelId);
    } catch (error) {
      console.error("Error in SubscribeToChannel use case:", error);
      throw error;
    }
  }
}
