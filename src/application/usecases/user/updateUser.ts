import { UserEntity } from "../../../domain/entities/user";
import { IUserRepository } from "../../interface/IUserRepository";

export class UpdateUser {
  constructor(private userRepository: IUserRepository) {}

  async execute(
    id: number,
    updateData: Partial<UserEntity>
  ): Promise<UserEntity | null> {
    return await this.userRepository.updateUser(id, updateData);
  }
}
