import { UserEntity } from "../../domain/entities/user";

export interface IUserRepository {
  createUser(user: UserEntity): Promise<UserEntity>;
  updateUser(id: string, user: Partial<UserEntity>): Promise<UserEntity | null>;
  findUserById(id: string): Promise<UserEntity | null>;
  findUserByEmail(email: string): Promise<UserEntity | null>;
  updateRole(email: string, role: string): Promise<UserEntity | null>;}
