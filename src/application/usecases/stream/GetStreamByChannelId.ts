import { StreamModel } from "../../../infrastructure/models/command/stream";
import { StreamQueryRepository } from "../../../infrastructure/repositories/query/streamQueryMongoRepository";

export class GetStreamByChannelIdUsecase {
  constructor(private streamRepository: StreamQueryRepository) {}
  async execute(channelId: string): Promise<StreamModel[]> {
    return await this.streamRepository.findByChannelId(channelId);
  }
}
