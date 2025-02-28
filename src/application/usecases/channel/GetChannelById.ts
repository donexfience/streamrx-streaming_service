import { ChannelEntity } from "../../../domain/entities/channel";
import { IChannelRepository } from "../../interface/IChannelRepository";

export class GetChannelById {
  constructor(private channelRepository: IChannelRepository) {}

  async execute(id: string): Promise<ChannelEntity> {
    try {
      return await this.channelRepository.findById(id);
    } catch (error) {
      console.error("Error in GetChannelByEmail use case:", error);
      throw error;
    }
  }
}
