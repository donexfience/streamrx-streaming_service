import { Repository } from "typeorm";
import { StreamModel } from "../models/stream";
import { AppDataSource } from "../../config/dbConfig";
import { IStreamRepository } from "../../application/interface/IStreamRepository";
import { StreamEntity } from "../../domain/entities/streaming";

export class StreamRepository implements IStreamRepository {
  private repository: Repository<StreamModel>;

  constructor() {
    this.repository = AppDataSource.getRepository(StreamModel);
  }

  async create(stream: Partial<StreamEntity>): Promise<StreamEntity> {
    try {
      console.log(stream, "stream data in the repository");
      const streamModel = this.repository.create(stream);
      const savedStream = await this.repository.save(streamModel);
      return new StreamEntity(savedStream);
    } catch (error) {
      console.log(error, "error in the repository of create stream");
      throw error;
    }
  }

  async findById(id: string): Promise<StreamEntity | null> {
    const stream = await this.repository.findOne({
      where: { id },
      relations: ["channel"],
    });
    return stream ? new StreamEntity(stream) : null;
  }

  async findByChannelId(channelId: string): Promise<StreamEntity[]> {
    const streams = await this.repository.find({
      where: { channelId },
      relations: ["channel"],
    });
    return streams.map((stream) => new StreamEntity(stream));
  }
  async findLatestByChannelId(channelId: string): Promise<StreamEntity | null> {
    const stream = await this.repository.findOne({
      where: { channelId },
      relations: ["channel"],
      order: { createdAt: "DESC" },
    });

    return stream ? new StreamEntity(stream) : null;
  }

  async edit(
    id: string,
    streamData: Partial<StreamEntity>
  ): Promise<StreamEntity> {
    try {
      const existingStream = await this.repository.findOne({
        where: { id },
        relations: ["channel"],
      });
      if (!existingStream) {
        throw new Error(`Stream with id ${id} not found`);
      }
      const updatedStream = this.repository.merge(existingStream, streamData);
      updatedStream.updatedAt = new Date();
      const savedStream = await this.repository.save(updatedStream);
      return new StreamEntity(savedStream);
    } catch (error) {
      console.log(error, "error in the repository of edit stream");
      throw error;
    }
  }
}
