import { IChannelSubscriptionRepository } from "../../interface/IChannelSubscriptionRepository";

export class GetSubscriptionStatus {
  constructor(private subscriptionRepository: IChannelSubscriptionRepository) {}

  async execute(userId: string, channelId: string): Promise<boolean> {
    try {
      return await this.subscriptionRepository.getSubscriptionStatus(
        userId,
        channelId
      );
    } catch (error) {
      console.error("Error in GetSubscriptionStatus use case:", error);
      throw error;
    }
  }
}
