import { IChannelRepository } from "../../interface/IChannelRepository";

export class DeleteChannel {
  constructor(private channelRepository: IChannelRepository) {}

  async execute(channelId: string): Promise<void> {
    try {
      await this.channelRepository.delete(channelId);
    } catch (error) {
      console.error("Error in DeleteChannel use case:", error);
      throw error;
    }
  }
}
