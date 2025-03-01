import { StreamEntity } from "../../domain/entities/streaming";

export interface IStreamRepository {
  create(stream: Partial<StreamEntity>): Promise<StreamEntity>;
  edit(id: string, streamData: Partial<StreamEntity>): Promise<StreamEntity>;
}
