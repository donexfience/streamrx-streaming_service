import { Repository } from "typeorm";
import { ChannelModel } from "../models/channel";
import { ChannelEntity } from "../../domain/entities/channel";
import { AppDataSource } from "../../config/dbConfig";
import { IChannelRepository } from "../../application/interface/IChannelRepository";

export class ChannelRepository implements IChannelRepository {
  private channelRepository: Repository<ChannelModel>;

  constructor() {
    this.channelRepository = AppDataSource.getRepository(ChannelModel);
  }

  async create(channelData: Partial<ChannelEntity>): Promise<ChannelEntity> {
    const channelModel = this.channelRepository.create(channelData);
    const savedChannel = await this.channelRepository.save(channelModel);
    return new ChannelEntity(savedChannel);
  }

  async update(
    channelId: string,
    updateData: Partial<ChannelEntity>
  ): Promise<ChannelEntity> {
    console.log("update need data", channelId, updateData);
    const result = await this.channelRepository.update(channelId, updateData);
    console.log(result, "updated channel");
    if (result.affected === 0) {
      throw new Error(`Channel with ID ${channelId} not found`);
    }
    const updatedChannel = await this.channelRepository.findOne({
      where: { id: channelId },
      relations: ["owner"],
    });
    console.log(updatedChannel, "after updation");
    if (!updatedChannel) {
      throw new Error(`Channel with ID ${channelId} not found after update`);
    }
    return new ChannelEntity(updatedChannel);
  }

  async delete(channelId: string): Promise<void> {
    const result = await this.channelRepository.delete(channelId);
    if (result.affected === 0) {
      throw new Error(`Channel with ID ${channelId} not found`);
    }
  }

  async subscribe(channelId: string): Promise<void> {
    console.log(channelId, "channel Id of the subscribing");
    try {
      const result = await this.channelRepository
        .createQueryBuilder()
        .update(ChannelModel)
        .set({ subscribersCount: () => `"subscribersCount" + 1` })
        .where("id = :id", { id: channelId })
        .execute();

      if (result.affected === 0) {
        throw new Error(`Channel with ID ${channelId} not found`);
      }
      console.log(result, "channel count after subscription");
    } catch (error) {
      console.error(error, "error of increasing count");
      throw error;
    }
  }

  async unsubscribe(channelId: string): Promise<void> {
    try {
      const result = await this.channelRepository
        .createQueryBuilder()
        .update(ChannelModel)
        .set({ subscribersCount: () => `"subscribersCount" - 1` })
        .where("id = :id", { id: channelId })
        .execute();

      if (result.affected === 0) {
        throw new Error(`Channel with ID ${channelId} not found`);
      }
    } catch (error) {
      console.error(error, "error of decreasing count");
      throw error;
    }
  }

  async findById(channelId: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findOne({
      where: { id: channelId },
      relations: ["owner"],
    });
    if (!channel) {
      throw new Error(`Channel with ID ${channelId} not found`);
    }
    return new ChannelEntity(channel);
  }

  async findByEmails(email: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findOne({
      where: { owner: { email } },
      relations: ["owner"],
    });
    if (!channel) {
      throw new Error(`Channel with owner email ${email} not found`);
    }
    return new ChannelEntity(channel);
  }

  async findByEmail(email: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findOne({
      where: { email },
      relations: ["owner"],
    });
    if (!channel) {
      throw new Error(`Channel with email ${email} not found`);
    }
    return new ChannelEntity(channel);
  }
}
