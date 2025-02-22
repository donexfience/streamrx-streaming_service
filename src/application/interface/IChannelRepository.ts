import { ChannelEntity } from "../../domain/entities/channel";

export interface IChannelRepository {
  create(channelData: Partial<ChannelEntity>): Promise<ChannelEntity>;

  update(
    channelId: string,
    updateData: Partial<ChannelEntity>
  ): Promise<ChannelEntity>;

  delete(channelId: string): Promise<void>;
  subscribe(channelId: string): Promise<void>;
  unsubscribe(channelId: string): Promise<void>;
  findById(channelId: string): Promise<ChannelEntity>;
  findByEmail(email: string): Promise<ChannelEntity>;
}
