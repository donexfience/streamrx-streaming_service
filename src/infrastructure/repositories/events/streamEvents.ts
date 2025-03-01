import { QUEUES, RabbitMQConnection, RabbitMQConsumer } from "streamrx_common";
import amqplib from "amqplib";
import { StreamMongoModel } from "../../models/query/stream";

export class StreamSyncConsumer {
  private rabbitMQConsumer: RabbitMQConsumer;
  private rabbitMQConnection: RabbitMQConnection;

  constructor() {
    this.rabbitMQConnection = RabbitMQConnection.getInstance();
    this.rabbitMQConsumer = new RabbitMQConsumer(this.rabbitMQConnection);
  }

  public async start() {
    try {
      await this.rabbitMQConnection.connect(
        process.env.AMQP_PORT || "amqp://localhost"
      );
      await this.rabbitMQConsumer.consumeFromExchange(
        "stream-created",
        this.handleStreamCreatedMessage.bind(this)
      );
      await this.rabbitMQConsumer.consumeFromExchange(
        "stream-updated",
        this.handleStreamUpdatedMessage.bind(this)
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
}
