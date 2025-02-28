import { StreamModel } from "../../../infrastructure/models/stream";
import { StreamRepository } from "../../../infrastructure/repositories/streamRepository";

export class GetStreamByChannelIdUsecase {
  constructor(private streamRepository: StreamRepository) {}
  async execute(channelId: string): Promise<StreamModel[]> {
    return await this.streamRepository.findByChannelId(channelId);
  }
}
