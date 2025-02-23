import { ChannelEntity } from "../../../domain/entities/channel";
import { IChannelRepository } from "../../interface/IChannelRepository";

export class EditChannel {
  constructor(private channelRepository: IChannelRepository) {}

  async execute(
    channelId: string,
    updateData: Partial<ChannelEntity>
  ): Promise<ChannelEntity> {
    try {
      return await this.channelRepository.update(channelId, updateData);
    } catch (error) {
      console.error("Error in EditChannel use case:", error);
      throw error;
    }
  }
}
