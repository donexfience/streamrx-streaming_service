// application/usecases/stream/UpdateStreamParticipantsUsecase.ts
import { StreamEntity } from "../../../domain/entities/streaming";
import { IStreamRepository } from "../../interface/IStreamRepository";

export class UpdateStreamParticipantsUsecase {
  constructor(private streamRepository: IStreamRepository) {}

  async execute(
    streamId: string,
    participant: { userId: string; role: "host" | "guest"; username: string }
  ): Promise<StreamEntity> {
    try {
      const currentStream = await this.streamRepository.edit(streamId, {});
      if (!currentStream) {
        throw new Error(`Stream with id ${streamId} not found`);
      }

      const participants = currentStream.participants || [];

      if (!participants.some((p) => p.userId === participant.userId)) {
        participants.push(participant);
      }

      console.log(
        participant,
        streamId,
        "id and participant in the usecase upate participant"
      );

      const updatedStream = await this.streamRepository.edit(streamId, {
        participants,
      });

      return updatedStream;
    } catch (error) {
      console.error("Error updating stream participants:", error);
      throw error;
    }
  }
}
