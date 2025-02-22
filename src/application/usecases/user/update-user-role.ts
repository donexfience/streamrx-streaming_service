import { UserEntity } from "../../../domain/entities/user";
import { IUserRepository } from "../../interface/IUserRepository";

export class UpdateUserRole {
  constructor(private userRepository: IUserRepository) {}

  async execute(email: string, role: string): Promise<UserEntity | null> {
    const existingUser = await this.userRepository.findUserByEmail(email);
    if (!existingUser) {
      throw new Error(`User with email ${email} not found`);
    }
    console.log(email, role, "in UpdateUserRole use case");
    const updatedUser = await this.userRepository.updateRole(email, role);
    return updatedUser;
  }
}
