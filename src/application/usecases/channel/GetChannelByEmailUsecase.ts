import { ChannelEntity } from "../../../domain/entities/channel";
import { IChannelRepository } from "../../interface/IChannelRepository";

export class GetChannelByEmail {
  constructor(private channelRepository: IChannelRepository) {}

  async execute(email: string): Promise<ChannelEntity> {
    try {
      return await this.channelRepository.findByEmail(email);
    } catch (error) {
      console.error("Error in GetChannelByEmail use case:", error);
      throw error;
    }
  }
}
