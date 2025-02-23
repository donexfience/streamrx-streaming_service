import { ChannelSubscriptionEntity } from "../../../domain/entities/subscription";
import { IChannelSubscriptionRepository } from "../../interface/IChannelSubscriptionRepository";

export class GetAllSubscribers {
  constructor(private subscriptionRepository: IChannelSubscriptionRepository) {}

  async execute(channelId: string): Promise<ChannelSubscriptionEntity[]> {
    try {
      return await this.subscriptionRepository.getAllSubscribers(channelId);
    } catch (error) {
      console.error("Error in GetAllSubscribers use case:", error);
      throw error;
    }
  }
}
