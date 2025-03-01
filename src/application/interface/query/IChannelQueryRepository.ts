import { Channel } from "../../../infrastructure/models/query/channel";

export interface IChannelRepository {
  create(channelData: Partial<Channel>): Promise<Channel>;
  update(channelId: string, updateData: Partial<Channel>): Promise<Channel>;
  delete(channelId: string): Promise<void>;
  findById(channelId: string): Promise<Channel>;
}
