import { UserEntity } from "../../../domain/entities/user";
import { IUserRepository } from "../../interface/IUserRepository";

export class GetUserById {
  constructor(private userRepository: IUserRepository) {}

  async execute(id: string): Promise<UserEntity | null> {
    return await this.userRepository.findUserById(id);
  }
}
