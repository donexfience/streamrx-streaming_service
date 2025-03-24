import { StreamSettingsModel } from "../../../infrastructure/models/streamSettingModel";
import { StreamSettingsRepository } from "../../../infrastructure/repositories/StreamSettingRepository";

export class CreateStreamSettingsUsecase {
  constructor(private streamSettingsRepository: StreamSettingsRepository) {}

  async execute(settings: Partial<StreamSettingsModel>): Promise<StreamSettingsModel> {
    return await this.streamSettingsRepository.create(settings);
  }
}