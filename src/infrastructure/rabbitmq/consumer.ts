import { QUEUES, RabbitMQConnection, RabbitMQConsumer } from "streamrx_common";
import amqplib from "amqplib";
import { CreateUser } from "../../application/usecases/user/createUser";
import { UpdateUser } from "../../application/usecases/user/updateUser";
import { UpdateUserRole } from "../../application/usecases/user/update-user-role";
import { SubscribeToChannel } from "../../application/usecases/subscriptions/subscribeChannelUsecase";
import { UnsubscribeFromChannel } from "../../application/usecases/subscriptions/unSubscribeChannelUsecase";
import { CreateChannel } from "../../application/usecases/channel/CreateChannelUsecase";
import { EditChannel } from "../../application/usecases/channel/EditChannelUsecase";

export class StreamServiceConsumer {
  private rabbitMQConsumer: RabbitMQConsumer;
  private createUserUsecase: CreateUser;
  private updateUserUsecase: UpdateUser;
  private subscribedUsecase: SubscribeToChannel;
  private unSubscribedUsecase: UnsubscribeFromChannel;
  private updatRoleUsecase: UpdateUserRole;
  private rabbitMQConnection: RabbitMQConnection;
  private channelCreateusecase: CreateChannel;
  private channelEditusecase: EditChannel;

  constructor(
    createUserUseCase: CreateUser,
    updateUserUseCase: UpdateUser,
    subscribedUsecase: SubscribeToChannel,
    unSubscribedUsecase: UnsubscribeFromChannel,
    channelCreateusecase: CreateChannel,
    channelEditusecase: EditChannel,
    updatRoleUsecase: UpdateUserRole
  ) {
    this.createUserUsecase = createUserUseCase;
    this.updateUserUsecase = updateUserUseCase;
    this.subscribedUsecase = subscribedUsecase;
    this.unSubscribedUsecase = unSubscribedUsecase;
    this.channelCreateusecase = channelCreateusecase;
    this.channelEditusecase = channelEditusecase;
    this.updatRoleUsecase = updatRoleUsecase;
    this.rabbitMQConnection = RabbitMQConnection.getInstance();
    this.rabbitMQConsumer = new RabbitMQConsumer(this.rabbitMQConnection);
  }

  public async start() {
    try {
      await this.rabbitMQConnection.connect(
        process.env.RABBITMQ_URL || "amqp://localhost"
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
      const transformedData = {
        id: message._id,
        email: message.email,
        username: message.username || null,
        phone_number: message.phone_number || null,
        date_of_birth: message.date_of_birth || null,
        profileImageURL: message.profileImageURL || null,
        social_links: message.social_links || [],
        role: message.role || "VIEWER",
        bio: message.bio || null,
        tags: message.tags || [],
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
        updatedAt: message.updatedAt ? new Date(message.updatedAt) : new Date(),
      };
      console.log("[INFO] User Created message:", transformedData);
      await this.createUserUsecase.execute(transformedData);
    } catch (error) {
      console.error("[ERROR] Failed to handle user created message:", error);
      throw error;
    }
  }

  private async handleUserUpdatedMessage(msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      const transformedData = {
        email: message.email,
        username: message.username || null,
        phone_number: message.phone_number || null,
        date_of_birth: message.dateOfBirth || null,
        profileImageURL: message.profileImageURL || null,
        social_links: message.social_links || [],
        role: message.role || "VIEWER",
        bio: message.bio || null,
        tags: message.tags || [],
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
        updatedAt: message.updatedAt ? new Date(message.updatedAt) : new Date(),
      };
      console.log("[INFO] User Updated message:", transformedData);
      await this.updateUserUsecase.execute(message.id, transformedData);
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
      await this.updatRoleUsecase.execute(message.email, message.role);
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

  private async handleChannelEditMessage(msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      console.log("[INFO] User Updated message:", message);
      const transformedData = {
        id: message.updatedData._id,
        channelName: message.updatedData.channelName,
        description: message.updatedData.description,
        ownerId: message.updatedData.ownerId,
        category: message.updatedData.category,
        channelAccessibility: message.updatedData.channelAccessibility,
        channelBannerImageUrl: message.updatedData.channelBannerImageUrl,
        channelProfileImageUrl: message.updatedData.channelProfileImageUrl,
        contentType: message.updatedData.contentType,
        subscribersCount: message.updatedData.subscribersCount ?? 0,
        integrations: {
          youtube: message.updatedData.integrations?.youtube ?? false,
          twitch: message.updatedData.integrations?.twitch ?? false,
          discord: message.updatedData.integrations?.discord ?? false,
        },
        email: message.updatedData.email,
        ownerEmail: message.updatedData.ownerEmail,
        schedulePreference: message.updatedData.schedulePreference,
        socialLinks: {
          twitter: message.updatedData.socialLinks?.twitter || null,
          instagram: message.updatedData.socialLinks?.instagram || null,
          facebook: message.updatedData.socialLinks?.facebook || null,
        },
        streamSchedule: {
          days: message.updatedData.streamSchedule?.days || [],
          times: message.updatedData.streamSchedule?.times || [],
        },
        createdAt: message.updatedData.createdAt
          ? new Date(message.updatedData.createdAt)
          : undefined,
        updatedAt: message.updatedData.updatedAt
          ? new Date(message.updatedData.updatedAt)
          : undefined,
      };
      await this.channelEditusecase.execute(
        message.updatedData._id,
        transformedData
      );
    } catch (error) {
      console.error("[ERROR] Failed to handle user updated messagFe:", error);
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
      console.log("[INFO] Channel Created message:", message);

      const transformedData = {
        id: message._id,
        channelName: message.channelName,
        description: message.description || undefined,
        ownerId: message.ownerId,
        category: message.category || [],
        channelAccessibility: message.channelAccessibility,
        channelBannerImageUrl: message.channelBannerImageUrl || undefined,
        channelProfileImageUrl: message.channelProfileImageUrl || undefined,
        contentType: message.contentType || undefined,
        subscribersCount: message.subscribersCount || 0,
        integrations: message.integrations || {
          youtube: false,
          twitch: false,
          discord: false,
        },
        email: message.email || undefined,
        ownerEmail: message.ownerEmail,
        schedulePreference: message.schedulePreference || undefined,
        socialLinks: message.socialLinks || {
          twitter: null,
          instagram: null,
          facebook: null,
        },
        streamSchedule: message.streamSchedule || { days: [], times: [] },
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
        updatedAt: message.updatedAt ? new Date(message.updatedAt) : new Date(),
      };

      console.log(
        "[DEBUG] Transformed data for channel use case:",
        transformedData
      );

      await this.channelCreateusecase.execute(transformedData);
    } catch (error) {
      console.error("[ERROR] Failed to handle channel created message:", error);
      throw error;
    }
  }

  
}
