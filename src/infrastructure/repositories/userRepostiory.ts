import { Repository } from "typeorm";
import { IUserRepository } from "../../application/interface/IUserRepository";
import { UserModel } from "../models/user";
import { AppDataSource } from "../../config/dbConfig";
import { UserEntity } from "../../domain/entities/user";
import { FriendEntity } from "../../domain/entities/FriendRequest";

export class UserRepository implements IUserRepository {
  private userRepository: Repository<UserModel>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(UserModel);
  }

  async createUser(user: UserEntity): Promise<UserEntity> {
    try {
      const userModel = this.userRepository.create(user);
      console.log(userModel, "user model in the psql db repository");
      const savedUser = await this.userRepository.save(userModel);
      console.log(savedUser, "saved");

      return this.mapUserModelToEntity(savedUser);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }
      throw new Error("An unknown error occurred");
    }
  }

  async updateUser(
    id: string,
    user: Partial<UserEntity>
  ): Promise<UserEntity | null> {
    try {
      await this.userRepository.update(id, user);
      const updatedUser = await this.userRepository.findOne({
        where: { id },
        relations: [
          "sentFriendRequests",
          "sentFriendRequests.friend",
          "receivedFriendRequests",
          "receivedFriendRequests.user",
        ],
      });

      console.log(updatedUser, "updated user in the repository");

      return updatedUser ? this.mapUserModelToEntity(updatedUser) : null;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }
      throw new Error("An unknown error occurred during user update");
    }
  }

  async findUserById(id: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        "sentFriendRequests",
        "sentFriendRequests.friend",
        "receivedFriendRequests",
        "receivedFriendRequests.user",
      ],
    });
    return user ? this.mapUserModelToEntity(user) : null;
  }

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: [
        "sentFriendRequests",
        "sentFriendRequests.friend",
        "receivedFriendRequests",
        "receivedFriendRequests.user",
      ],
    });
    return user ? this.mapUserModelToEntity(user) : null;
  }

  async updateRole(email: string, role: string): Promise<UserEntity | null> {
    console.log(email, role, "in updateRole repository");
    const result = await this.userRepository.update({ email }, { role });
    if (result.affected === 0) {
      console.log(`No user found with email: ${email}`);
      return null;
    }

    const updatedUser = await this.userRepository.findOne({
      where: { email },
      relations: [
        "sentFriendRequests",
        "sentFriendRequests.friend",
        "receivedFriendRequests",
        "receivedFriendRequests.user",
      ],
    });
    console.log("Updated user from DB:", updatedUser);
    return updatedUser ? this.mapUserModelToEntity(updatedUser) : null;
  }

  async findStreamers(
    page: number,
    currentUserId: any,
    limit: number,
    search?: string,
    startDate?: any,
    endDate?: any
  ): Promise<UserEntity[]> {
    const query = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.sentFriendRequests", "sentFriend")
      .leftJoinAndSelect("sentFriend.friend", "sentFriendTarget")
      .leftJoinAndSelect("user.receivedFriendRequests", "receivedFriend")
      .leftJoinAndSelect("receivedFriend.user", "receivedFriendSource")
      .where("user.role = :role", { role: "streamer" })
      .andWhere("user.id != :currentUserId", { currentUserId });

    if (search) {
      query.andWhere("user.username ILIKE :search", { search: `%${search}%` });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.log("Invalid date range provided:", { startDate, endDate });
        throw new Error("Invalid date range provided");
      }
      query.andWhere("(user.createdAt BETWEEN :startDate AND :endDate)", {
        startDate: start,
        endDate: end,
      });
    } else if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        console.log("Invalid start date provided:", startDate);
        throw new Error("Invalid start date provided");
      }
      query.andWhere("user.createdAt >= :startDate", {
        startDate: start,
      });
    } else if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        console.log("Invalid end date provided:", endDate);
        throw new Error("Invalid end date provided");
      }
      query.andWhere("user.createdAt <= :endDate", {
        endDate: end,
      });
    }

    query
      .orderBy("user.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const totalCount = await query.getCount();
    console.log("Total streamers count:", totalCount);

    const users = await query.getMany();
    console.log("Fetched users:", users);
    return users.map((user) => this.mapUserModelToEntity(user));
  }

  private mapUserModelToEntity(userModel: UserModel): UserEntity {
    const sentFriendRequests =
      userModel.sentFriendRequests?.map(
        (fr) =>
          new FriendEntity({
            id: fr.id,
            userId: fr.user?.id,
            friendId: fr.friend?.id,
            status: fr.status as any,
            createdAt: fr.createdAt,
            updatedAt: fr.updatedAt,
          })
      ) || [];

    const receivedFriendRequests =
      userModel.receivedFriendRequests?.map(
        (fr) =>
          new FriendEntity({
            id: fr.id,
            userId: fr.user?.id,
            friendId: fr.friend?.id,
            status: fr.status as any,
            createdAt: fr.createdAt,
            updatedAt: fr.updatedAt,
          })
      ) || [];

    return new UserEntity({
      id: userModel.id,
      username: userModel.username,
      email: userModel.email,
      phone_number: userModel.phone_number,
      date_of_birth: userModel.date_of_birth,
      profileImageURL: userModel.profileImageURL,
      social_links: userModel.social_links,
      role: userModel.role,
      bio: userModel.bio,
      tags: userModel.tags,
      createdAt: userModel.createdAt,
      updatedAt: userModel.updatedAt,
      sentFriendRequests,
      receivedFriendRequests,
    });
  }
}
