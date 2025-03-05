import { InviteModel } from "../../infrastructure/models/invite";

export interface IInviteRepository {
  createInvite(
    token: string,
    channelId: string,
    expiresAt: Date
  ): Promise<InviteModel>;

  findByToken(token: string): Promise<InviteModel | null>;

  deleteExpiredInvites(): Promise<void>;
  deleteInvite(token: string): Promise<void>;
}
