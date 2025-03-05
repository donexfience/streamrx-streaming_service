import { StreamModel } from "../../../infrastructure/models/command/stream";
import { StreamRepository } from "../../../infrastructure/repositories/command/streamCommandRepository";

export class CreateStreamUsecase {
  constructor(private streamRepository: StreamRepository) {}

  async execute(
    streamData: Partial<StreamModel> & { channelId: string }
  ): Promise<StreamModel> {
    try {
      if (!streamData.title) {
        throw new Error("Title is required");
      }
      if (!streamData.channelId) {
        throw new Error("Channel ID is required");
      }
      if (!streamData.broadcastType) {
        throw new Error("Broadcast type is required");
      }
      if (!streamData.category) {
        throw new Error("Category is required");
      }
      if (!streamData.visibility) {
        throw new Error("Visibility is required");
      }

      const stream: Partial<StreamModel> = {
        title: streamData.title,
        description: streamData.description,
        broadcastType: streamData.broadcastType,
        category: streamData.category,
        visibility: streamData.visibility,
        thumbnail: streamData.thumbnail,
        fallbackVideo: streamData.fallbackVideo,
        schedule: streamData.schedule,
        playlistId: streamData.playlistId,
        liveChat: streamData.liveChat || {
          enabled: true,
          replay: false,
          participantMode: "Anyone",
          reactions: true,
          slowMode: false,
          slowModeDelay: "60",
        },
        channelId: streamData.channelId,
        createdBy: streamData.createdBy,
      };
      console.log(stream, "stream data in the usecase");
      return await this.streamRepository.create(stream);
    } catch (error: any) {
      console.error(error, "error got in the streamer create");
      throw error;
    }
  }
}
