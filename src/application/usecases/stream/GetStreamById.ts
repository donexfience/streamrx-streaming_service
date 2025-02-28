import { StreamModel } from "../../../infrastructure/models/stream";
import { StreamRepository } from "../../../infrastructure/repositories/streamRepository";

export class GetStreamByIdUsecase {
  constructor(private streamRepository: StreamRepository) {}
  async execute(id: string): Promise<StreamModel | null> {
    const stream = await this.streamRepository.findById(id);
    if (!stream) {
      throw new Error("Stream not found");
    }
    return stream;
  }
}
