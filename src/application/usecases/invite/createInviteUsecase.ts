import { v4 as uuidv4 } from "uuid";
import { addHours } from "date-fns";
import { InviteRepository } from "../../../infrastructure/repositories/inviteRepository";

export class createInviteUsecase {
  private inviteRepository: InviteRepository;

  constructor() {
    this.inviteRepository = new InviteRepository();
  }

  async createInvite(channelId: string, userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = addHours(new Date(), 24);
    await this.inviteRepository.createInvite(
      token,
      channelId,
      userId,
      expiresAt
    );
    return token;
  }
}
