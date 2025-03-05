import { LessThan, Repository } from "typeorm";
import { InviteModel } from "../models/invite";
import { AppDataSource } from "../../config/dbConfig";
import { IInviteRepository } from "../../application/interface/IInviteRepository";

export class InviteRepository implements IInviteRepository {
  private InviteRepository: Repository<InviteModel>;
  constructor() {
    this.InviteRepository = AppDataSource.getRepository(InviteModel);
  }

  async createInvite(
    token: string,
    channelId: string,
    expiresAt: Date
  ): Promise<InviteModel> {
    const invite = this.InviteRepository.create({
      token,
      channelId,
      expiresAt,
    });
    return this.InviteRepository.save(invite);
  }

  async findByToken(token: string): Promise<InviteModel | null> {
    return this.InviteRepository.findOne({
      where: { token },
      relations: ["channel"],
    });
  }

  async deleteExpiredInvites(): Promise<void> {
    await this.InviteRepository.delete({ expiresAt: LessThan(new Date()) });
  }
  async deleteInvite(token: string): Promise<void> {
    await this.InviteRepository.delete({ token });
  }
}
