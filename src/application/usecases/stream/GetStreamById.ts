import { StreamModel } from "../../../infrastructure/models/command/stream";
import { StreamQueryRepository } from "../../../infrastructure/repositories/query/streamQueryMongoRepository";

export class GetStreamByIdUsecase {
  constructor(private streamRepository: StreamQueryRepository) {}
  async execute(id: string): Promise<StreamModel | null> {
    const stream = await this.streamRepository.findById(id);
    if (!stream) {
      throw new Error("Stream not found");
    }
    return stream;
  }
}
