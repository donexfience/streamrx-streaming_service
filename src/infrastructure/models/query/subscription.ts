import mongoose, { Types, Document, Schema } from "mongoose";

export interface ChannelSubscription extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  channelId: Types.ObjectId;
  subscriptionDate: Date;
  notificationsEnabled: boolean;
  status: "active" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const channelSubscriptionSchema = new Schema<ChannelSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

channelSubscriptionSchema.index({ userId: 1, channelId: 1 }, { unique: true });
channelSubscriptionSchema.index({ channelId: 1, createdAt: -1 });
channelSubscriptionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ChannelSubscription>(
  "ChannelSubscription",
  channelSubscriptionSchema
);
