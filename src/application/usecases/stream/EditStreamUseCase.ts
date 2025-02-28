import { StreamEntity } from "../../../domain/entities/streaming";
import { StreamModel } from "../../../infrastructure/models/stream";
import { StreamRepository } from "../../../infrastructure/repositories/streamRepository";

export class EditStreamUsecase {
  constructor(private streamRepository: StreamRepository) {}
  async execute(
    channelId: string,
    updateData: StreamEntity
  ): Promise<StreamEntity | null> {
    return await this.streamRepository.edit(channelId, updateData);
  }
}
