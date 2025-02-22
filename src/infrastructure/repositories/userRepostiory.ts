import { Repository } from "typeorm";
import { IUserRepository } from "../../application/interface/IUserRepository";
import { UserModel } from "../models/user";
import { AppDataSource } from "../../config/dbConfig";
import { UserEntity } from "../../domain/entities/user";

export class UserRepository implements IUserRepository {
  private userRepository: Repository<UserModel>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(UserModel);
  }

  async createUser(user: UserEntity): Promise<UserEntity> {
    const userModel = this.userRepository.create(user);
    const savedUser = await this.userRepository.save(userModel);
    return new UserEntity(savedUser);
  }

  async updateUser(
    id: string,
    user: Partial<UserEntity>
  ): Promise<UserEntity | null> {
    await this.userRepository.update(id, user);
    const updatedUser = await this.userRepository.findOneBy({ id });
    return updatedUser ? new UserEntity(updatedUser) : null;
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOneBy({ id });
    return user ? new UserEntity(user) : null;
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOneBy({ email });
    return user ? new UserEntity(user) : null;
  }

  async updateRole(email: string, role: string): Promise<UserEntity | null> {
    console.log(email, role, "in updateRole repository");
    const result = await this.userRepository.update({ email }, { role });
    if (result.affected === 0) {
      console.log(`No user found with email: ${email}`);
      return null;
    }

    const updatedUser = await this.userRepository.findOneBy({ email });
    console.log("Updated user from DB:", updatedUser);
    return updatedUser ? new UserEntity(updatedUser) : null;
  }
}
