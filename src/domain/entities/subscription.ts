import { IChannelSubscription } from "./../interfaces/IChannelSubscription";

export class ChannelSubscriptionEntity implements IChannelSubscription {
  id?: string;
  userId: string;
  channelId: string;
  notificationsEnabled: boolean;
  status: "active" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: {
    id?: string;
    userId: string;
    channelId: string;
    notificationsEnabled?: boolean;
    status?: "active" | "cancelled";
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.channelId = props.channelId;
    this.notificationsEnabled = props.notificationsEnabled ?? true;
    this.status = props.status || "active";
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }
}
