import { StreamEntity } from "../../../domain/entities/streaming";
import { StreamModel } from "../../../infrastructure/models/stream";
import { StreamRepository } from "../../../infrastructure/repositories/streamRepository";

export class GetLatestStreamUsecase {
  constructor(private streamRepository: StreamRepository) {}
  async execute(channelId: string): Promise<StreamEntity | null> {
    return await this.streamRepository.findLatestByChannelId(channelId);
  }
}
