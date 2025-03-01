import { IChannelRepository } from "../../../application/interface/query/IChannelQueryRepository";
import Channel, {
  Channel as ChannelType,
} from "../../../infrastructure/models/query/channel";

export class ChannelRepostiory implements IChannelRepository {
  async create(channelData: Partial<ChannelType>): Promise<ChannelType> {
    const channel = new Channel(channelData);
    await channel.save();
    const plainDocument = channel.toObject();
    return plainDocument;
  }

  async update(
    channelId: string,
    updateData: Partial<ChannelType>
  ): Promise<ChannelType> {
    const channel = await Channel.findByIdAndUpdate(channelId, updateData, {
      new: true,
    });
    if (!channel) {
      throw new Error(`Channel with ID ${channelId} not found`);
    }
    return channel;
  }

  async delete(channelId: string): Promise<void> {
    await Channel.findByIdAndDelete(channelId);
  }

  async subscribe(channelId: string): Promise<void> {
    console.log(channelId, "channel Id of the subscribing");
    try {
      const channel = await Channel.updateOne(
        {
          _id: channelId,
        },
        { $inc: { subscribersCount: 1 } }
      );
      console.log(channel, "channel count after subscription");
    } catch (error) {
      console.error(error, "error of increasing count");
    }
  }

  async unsubscribe(channelId: string): Promise<void> {
    try {
      const channel = await Channel.updateOne(
        {
          _id: channelId,
        },
        { $inc: { subscribersCount: -1 } }
      );
    } catch (error) {
      console.error(error, "error of increasing count");
    }
  }

  async findById(channelId: string): Promise<ChannelType> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error(`Channel with ID ${channelId} not found`);
    }
    return channel;
  }

  async findByEmails(email: string): Promise<ChannelType> {
    const channel = await Channel.findOne()
      .populate({
        path: "ownerId",
        match: { email: email },
        select: "email",
      })
      .exec();
    if (!channel || !channel.ownerId) {
      throw new Error(`Channel with owner email ${email} not found`);
    }
    return channel;
  }

  async findByEmail(email: string): Promise<ChannelType> {
    const channel = await Channel.findOne({ email })
      .populate({ path: "ownerId", select: "email" })
      .exec();

    if (!channel) {
      throw new Error(`Channel with email ${email} not found`);
    }

    return channel;
  }
}
