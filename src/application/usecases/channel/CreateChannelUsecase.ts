import { ChannelEntity } from "../../../domain/entities/channel";
import { IChannelRepository } from "../../interface/IChannelRepository";
import { IUserRepository } from "../../interface/IUserRepository";
import { UserEntity } from "../../../domain/entities/user";

export class CreateChannel {
  constructor(
    private channelRepository: IChannelRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(channelData: Partial<ChannelEntity>): Promise<ChannelEntity> {
    try {
      if (!channelData.email) {
        throw new Error("Email is required");
      }
      try {
        const existingChannel = await this.channelRepository.findByEmail(
          channelData.email
        );
        if (existingChannel) {
          throw new Error("Channel with this email already exists");
        }
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("not found")) {
          throw error;
        }
      }

      const user = await this.userRepository.findUserByEmail(channelData.email);
      if (!user) {
        throw new Error("User not found");
      }

      const newData: Partial<ChannelEntity> = {
        ...channelData,
        ownerId: user.id,
      };

      return await this.channelRepository.create(newData);
    } catch (error) {
      console.error("Error in CreateChannel use case:", error);
      throw error;
    }
  }
}
