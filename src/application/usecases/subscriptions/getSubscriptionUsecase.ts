import { ChannelSubscriptionEntity } from "../../../domain/entities/subscription";
import { IChannelSubscriptionRepository } from "../../interface/IChannelSubscriptionRepository";

export class GetUserSubscriptions {
  constructor(private subscriptionRepository: IChannelSubscriptionRepository) {}

  async execute(userId: string): Promise<ChannelSubscriptionEntity[]> {
    try {
      return await this.subscriptionRepository.getSubscriptions(userId);
    } catch (error) {
      console.error("Error in GetUserSubscriptions use case:", error);
      throw error;
    }
  }
}
