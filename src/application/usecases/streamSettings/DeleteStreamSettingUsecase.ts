import { StreamSettingsRepository } from "../../../infrastructure/repositories/StreamSettingRepository";

export class DeleteStreamSettingsUsecase {
  constructor(private streamSettingsRepository: StreamSettingsRepository) {}

  async execute(streamId: string): Promise<boolean> {
    return await this.streamSettingsRepository.delete(streamId);
  }
}