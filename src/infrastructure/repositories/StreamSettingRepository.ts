import { Repository } from "typeorm";
import { AppDataSource } from "../../config/dbConfig";
import { StreamSettingsModel } from "../models/streamSettingModel";

export class StreamSettingsRepository {
  private repository: Repository<StreamSettingsModel>;

  constructor() {
    this.repository = AppDataSource.getRepository(StreamSettingsModel);
  }

  async create(
    settings: Partial<StreamSettingsModel>
  ): Promise<StreamSettingsModel | any> {
    try {
      console.log(settings, "setting got in the repository");
      const newSettings = this.repository.create(settings);
      return await this.repository.save(newSettings);
    } catch (error) {
      console.log(error, "error got creating stram setting ");
      return error;
    }
  }

  async findByStreamId(streamId: string): Promise<StreamSettingsModel | null> {
    console.log(streamId, "stream id got in the repository");
    return await this.repository.findOne({ where: { streamId: streamId } });
  }

  async update(
    streamId: string,
    settings: Partial<StreamSettingsModel>
  ): Promise<StreamSettingsModel | null> {
    const existingSettings = await this.findByStreamId(streamId);
    if (!existingSettings) return null;
    await this.repository.update({ streamId }, settings);
    return await this.findByStreamId(streamId);
  }

  async delete(streamId: string): Promise<boolean> {
    const result = await this.repository.delete({ streamId });
    return (result.affected ?? 0) > 0;
  }
}
