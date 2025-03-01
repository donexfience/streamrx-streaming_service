import { StreamEntity } from "../../../domain/entities/streaming";
import { StreamQueryRepository } from "../../../infrastructure/repositories/query/streamQueryMongoRepository";

export class GetLatestStreamUsecase {
  constructor(private streamRepository: StreamQueryRepository) {}
  async execute(channelId: string): Promise<StreamEntity | null> {
    return await this.streamRepository.findLatestByChannelId(channelId);
  }
}
