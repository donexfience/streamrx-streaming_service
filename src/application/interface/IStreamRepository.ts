import { StreamEntity } from "../../domain/entities/streaming";

export interface IStreamRepository {
  create(stream: Partial<StreamEntity>): Promise<StreamEntity>;
  findById(id: string): Promise<StreamEntity | null>;
  findByChannelId(channelId: string): Promise<StreamEntity[]>;
  findLatestByChannelId(channelId: string): Promise<StreamEntity | null>;
  edit(id: string, streamData: Partial<StreamEntity>): Promise<StreamEntity>;
}
