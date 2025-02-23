import { QUEUES, RabbitMQConnection, RabbitMQConsumer } from "streamrx_common";
import amqplib from "amqplib";
import { CreateUser } from "../../application/usecases/user/createUser";
import { UpdateUser } from "../../application/usecases/user/updateUser";
import { UpdateUserRole } from "../../application/usecases/user/update-user-role";
import { SubscribeToChannel } from "../../application/usecases/subscriptions/subscribeChannelUsecase";
import { UnsubscribeFromChannel } from "../../application/usecases/subscriptions/unSubscribeChannelUsecase";
import { CreateChannel } from "../../application/usecases/channel/CreateChannelUsecase";

export class ChannelServiceConsumer {
  private rabbitMQConsumer: RabbitMQConsumer;
  private createUserUsecase: CreateUser;
  private updateUserUsecase: UpdateUser;
  private subscribedUsecase: SubscribeToChannel;
  private unSubscribedUsecase: UnsubscribeFromChannel;
  private updateUserRoleUsecase: UpdateUserRole;
  private rabbitMQConnection: RabbitMQConnection;
  private channelCreateusecase: CreateChannel;

  constructor(
    createUserUseCase: CreateUser,
    updateUserUseCase: UpdateUser,
    subscribedUsecase: SubscribeToChannel,
    unSubscribedUsecase: UnsubscribeFromChannel,
    channelCreateusecase: CreateChannel
  ) {
    this.createUserUsecase = createUserUseCase;
    this.updateUserUsecase = updateUserUseCase;
    this.subscribedUsecase = subscribedUsecase;
    this.unSubscribedUsecase = unSubscribedUsecase;
    this.channelCreateusecase = channelCreateusecase;

    this.rabbitMQConnection = RabbitMQConnection.getInstance();
    this.rabbitMQConsumer = new RabbitMQConsumer(this.rabbitMQConnection);
  }

  public async start() {
    try {
      await this.rabbitMQConnection.connect(
        process.env.amqp_port || "amqp://localhost"
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
        "subscription-created",
        this.handleSubscriptionCreatedMessage.bind(this)
      );

      await this.rabbitMQConsumer.consumeFromExchange(
        "subscription-deleted",
        this.handleSubscriptionDeletedMessage.bind(this)
      );
      console.log(
        "[INFO] Started consuming messages from RabbitMQ queues and exchanges."
      );
    } catch (error) {
      console.error("[ERROR] Failed to start consuming:", error);
      throw error;
    }
  }

  private async handleUserCreatedMessage(msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Created message:", message);
      await this.createUserUsecase.execute(message);
    } catch (error) {
      console.error("[ERROR] Failed to handle user created message:", error);
      throw error;
    }
  }

  private async handleUserUpdatedMessage(msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Updated message:", message);
      await this.updateUserUsecase.execute(message.id, message);
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated message:", error);
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
      await this.updateUserRoleUsecase.execute(message.email, message.role);
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated message:", error);
      throw error;
    }
  }
  private async handleSubscriptionCreatedMessage(
    msg: amqplib.ConsumeMessage | null
  ) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Updated message:", message);
      await this.subscribedUsecase.execute(message.userId, message.channelId);
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated message:", error);
      throw error;
    }
  }
  private async handleSubscriptionDeletedMessage(
    msg: amqplib.ConsumeMessage | null
  ) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Updated message:", message);
      await this.unSubscribedUsecase.execute(message.userId, message.channelId);
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated message:", error);
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
      await this.channelCreateusecase.execute(message);
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated message:", error);
      throw error;
    }
  }
}
