import { StreamSettingsModel } from "../../../infrastructure/models/streamSettingModel";
import { StreamSettingsRepository } from "../../../infrastructure/repositories/StreamSettingRepository";

export class UpdateStreamSettingsUsecase {
  constructor(private streamSettingsRepository: StreamSettingsRepository) {}

  async execute(
    streamId: string,
    settings: Partial<StreamSettingsModel>
  ): Promise<StreamSettingsModel | null> {
    return await this.streamSettingsRepository.update(streamId, settings);
  }
}
