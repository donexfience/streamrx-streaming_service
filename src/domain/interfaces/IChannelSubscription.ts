export interface IChannelSubscription {
  id?: string;
  userId: string;
  channelId: string;
  notificationsEnabled: boolean;
  status: "active" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}
