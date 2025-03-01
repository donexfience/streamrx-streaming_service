import { QUEUES, RabbitMQConnection, RabbitMQConsumer } from "streamrx_common";
import amqplib from "amqplib";
import { StreamMongoModel } from "../../models/query/stream";
import { UserRepository } from "../query/userRepositroy";
import { ChannelRepostiory } from "../query/channelRepository";

export class StreamSyncConsumer {
  private rabbitMQConsumer: RabbitMQConsumer;
  private rabbitMQConnection: RabbitMQConnection;
  private UserRepository: UserRepository;
  private ChannelRepository: ChannelRepostiory;

  constructor() {
    this.rabbitMQConnection = RabbitMQConnection.getInstance();
    this.rabbitMQConsumer = new RabbitMQConsumer(this.rabbitMQConnection);
    this.ChannelRepository = new ChannelRepostiory();
    this.UserRepository = new UserRepository();
  }

  public async start() {
    try {
      await this.rabbitMQConnection.connect(
        process.env.RABBITMQ_URL || "amqp://localhost"
      );
      await this.rabbitMQConsumer.consumeFromExchange(
        "stream-created",
        this.handleStreamCreatedMessage.bind(this)
      );
      await this.rabbitMQConsumer.consumeFromExchange(
        "stream-updated",
        this.handleStreamUpdatedMessage.bind(this)
      );
      await this.rabbitMQConsumer.consumeFromExchange(
        "user-updated",
        this.handleUserUpdatedMessage.bind(this)
      );
      await this.rabbitMQConsumer.consumeFromExchange(
        "user-created",
        this.handleUserCreatedMessage.bind(this)
      );

      await this.rabbitMQConsumer.consumeFromExchange(
        "userrole-changed",
        this.handleUserUpdatedByEmailMessage.bind(this)
      );

      await this.rabbitMQConsumer.consumeFromExchange(
        "channel-created",
        this.handleChannelCreatedMessage.bind(this)
      );

      await this.rabbitMQConsumer.consumeFromExchange(
        "channel-edited",
        this.handleChannelEditMessage.bind(this)
      );

      console.log("[INFO] Started consuming stream events from RabbitMQ.");
    } catch (error) {
      console.error("[ERROR] Failed to start consuming:", error);
      throw error;
    }
  }

  private async handleStreamCreatedMessage(msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const stream = JSON.parse(msg.content.toString());
      console.log("[INFO] Stream Created message:", stream);
      await StreamMongoModel.create(stream);
      console.log(`Stream ${stream.id} synced to MongoDB`);
    } catch (error) {
      console.error("[ERROR] Failed to handle stream created message:", error);
      throw error;
    }
  }

  private async handleStreamUpdatedMessage(msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const stream = JSON.parse(msg.content.toString());
      console.log("[INFO] Stream Updated message:", stream);
      await StreamMongoModel.updateOne({ id: stream.id }, stream, {
        upsert: true,
      });
      console.log(`Stream ${stream.id} updated in MongoDB`);
    } catch (error) {
      console.error("[ERROR] Failed to handle stream updated message:", error);
      throw error;
    }
  }
  private async handleUserCreatedMessage(msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Created message:", message);
      await this.UserRepository.create(message);
    } catch (error) {
      console.error("[ERROR] Failed to handle user created message:", error);
      throw error;
    }
  }

  private async handleUserUpdatedByEmailMessage(
    msg: amqplib.ConsumeMessage | null
  ) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Updated message:", message);
      await this.UserRepository.updateRoleByEmail(message.email, message.role);
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated message:", error);
      throw error;
    }
  }

  private async handleUserUpdatedMessage(msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Updated message:", message);
      await this.UserRepository.updateById(message.id, message);
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated message:", error);
      throw error;
    }
  }
  private async handleChannelEditMessage(msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Updated message:", message);
      await this.ChannelRepository.update(message.id, message.updatedData);
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated messagFe:", error);
      throw error;
    }
  }

  private async handleChannelCreatedMessage(
    msg: amqplib.ConsumeMessage | null
  ) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Updated message:", message);
      await this.ChannelRepository.create(message);
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated message:", error);
      throw error;
    }
  }
}
