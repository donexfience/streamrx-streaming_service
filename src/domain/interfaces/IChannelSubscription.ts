export interface IChannelSubscription {
  id?: number;
  userId: number;
  channelId: number;
  notificationsEnabled: boolean;
  status: "active" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}
