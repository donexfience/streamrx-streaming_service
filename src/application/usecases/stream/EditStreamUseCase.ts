import { StreamEntity } from "../../../domain/entities/streaming";
import { StreamModel } from "../../../infrastructure/models/command/stream";
import { StreamRepository } from "../../../infrastructure/repositories/command/streamCommandRepository";

export class EditStreamUsecase {
  constructor(private streamRepository: StreamRepository) {}
  async execute(
    channelId: string,
    updateData: StreamEntity
  ): Promise<StreamEntity | null> {
    return await this.streamRepository.edit(channelId, updateData);
  }
}
