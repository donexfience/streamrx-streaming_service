import { StreamEntity } from "../../../domain/entities/streaming";
import { StreamMongoModel } from "../../models/query/stream";

export interface IStreamQueryRepository {
  findById(id: string): Promise<StreamEntity | null>;
  findByChannelId(channelId: string): Promise<StreamEntity[]>;
  findLatestByChannelId(channelId: string): Promise<StreamEntity | null>;
}

export class StreamQueryRepository implements IStreamQueryRepository {
  async findById(id: string): Promise<StreamEntity | null> {
    const stream: any = await StreamMongoModel.findOne({ id }).exec();
    return stream ? new StreamEntity(stream.toObject()) : null;
  }

  async findByChannelId(channelId: string): Promise<StreamEntity[]> {
    const streams: any = await StreamMongoModel.find({ channelId }).exec();
    console.log(streams, "streamasssssssssssssssssss");
    return streams.map((stream: any) => new StreamEntity(stream.toObject()));
  }

  async findLatestByChannelId(channelId: string): Promise<StreamEntity | null> {
    const stream: any = await StreamMongoModel.findOne({ channelId })
      .sort({ createdAt: -1 })
      .exec();
    return stream ? new StreamEntity(stream.toObject()) : null;
  }
}
