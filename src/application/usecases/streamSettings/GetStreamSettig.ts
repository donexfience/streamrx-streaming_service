import { StreamSettingsModel } from "../../../infrastructure/models/streamSettingModel";
import { StreamSettingsRepository } from "../../../infrastructure/repositories/StreamSettingRepository";


export class GetStreamSettingsUsecase {
  constructor(private streamSettingsRepository: StreamSettingsRepository) {}

  async execute(streamId: string): Promise<StreamSettingsModel | null> {
    console.log(streamId,"stream id in the usecse")
    return await this.streamSettingsRepository.findByStreamId(streamId);
  }
}