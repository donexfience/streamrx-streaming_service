import { Repository } from "typeorm";
import { IStreamRepository } from "../../../application/interface/IStreamRepository";
import { StreamModel } from "../../models/command/stream";
import { AppDataSource } from "../../../config/dbConfig";
import { StreamEntity } from "../../../domain/entities/streaming";
import { RabbitMQConnection, RabbitMQProducer } from "streamrx_common";

export class StreamRepository implements IStreamRepository {
  private repository: Repository<StreamModel>;
  private rabbitMQProducer: RabbitMQProducer;

  constructor() {
    this.repository = AppDataSource.getRepository(StreamModel);
    const rabbitmqConnection = RabbitMQConnection.getInstance();
    this.rabbitMQProducer = new RabbitMQProducer(rabbitmqConnection);
  }

  async create(stream: Partial<StreamEntity>): Promise<StreamEntity> {
    try {
      const streamModel = this.repository.create(stream);
      const savedStream = await this.repository.save(streamModel);
      const streamEntity = new StreamEntity(savedStream);
      await this.rabbitMQProducer.publishToExchange(
        "stream-created",
        "",
        streamEntity
      );
      return streamEntity;
    } catch (error) {
      console.log(error, "error in the repository of create stream");
      throw error;
    }
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
      console.log(streamData, "udpate need dta");
      const updatedStream = this.repository.merge(existingStream, streamData);
      console.log(updatedStream, "last udpated steram");
      updatedStream.updatedAt = new Date();
      const savedStream = await this.repository.save(updatedStream);
      const streamEntity = new StreamEntity(savedStream);
      console.log(streamEntity,savedStream,"stream after convertion with strem entity")

      await this.rabbitMQProducer.publishToExchange(
        "stream-updated",
        "",
        savedStream
      );
      return streamEntity;
    } catch (error) {
      console.log(error, "error in the repository of edit stream");
      throw error;
    }
  }

  async findById(id: string): Promise<StreamEntity> {
    try {
      const stream = await this.repository.findOne({
        where: { id },
        relations: ["channel"],
      });
      if (!stream) throw new Error(`Stream with id ${id} not found`);
      return new StreamEntity(stream);
    } catch (error) {
      console.log(error, "error in the repository of findById stream");
      throw error;
    }
  }
}
