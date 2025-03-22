import { Repository } from "typeorm";
import { FriendModel } from "../models/friend";
import { AppDataSource } from "../../config/dbConfig";
import { UserEntity } from "../../domain/entities/user";
import { IFriendRepository } from "../../application/interface/IfriendRequestRepository";
import { FriendEntity, FriendStatus } from "../../domain/entities/FriendRequest";

export class FriendRepository implements IFriendRepository {
  private friendRepository: Repository<FriendModel>;

  constructor() {
    this.friendRepository = AppDataSource.getRepository(FriendModel);
  }

  async createFriend(friend: FriendEntity): Promise<FriendEntity> {
    const friendModel = this.friendRepository.create({
      user: { id: friend.userId } as any,
      friend: { id: friend.friendId } as any,
      status: friend.status,
      previousStatus: friend.previousStatus,
    });
    const savedFriend = await this.friendRepository.save<FriendModel>(friendModel);
    return new FriendEntity({
      id: savedFriend.id,
      userId: savedFriend.user.id,
      friendId: savedFriend.friend.id,
      status: savedFriend.status as FriendStatus,
      previousStatus: savedFriend.previousStatus
        ? (savedFriend.previousStatus as FriendStatus)
        : undefined,
      createdAt: savedFriend.createdAt,
      updatedAt: savedFriend.updatedAt,
    });
  }

  async updateFriend(id: string, friend: Partial<FriendEntity>): Promise<FriendEntity | null> {
    await this.friendRepository.update(id, friend);
    const updatedFriend = await this.friendRepository.findOne({
      where: { id },
      relations: ["user", "friend"],
    });
    return updatedFriend
      ? new FriendEntity({
          id: updatedFriend.id,
          userId: updatedFriend.user.id,
          friendId: updatedFriend.friend.id,
          status: updatedFriend.status as FriendStatus,
          previousStatus: updatedFriend.previousStatus
            ? (updatedFriend.previousStatus as FriendStatus)
            : undefined,
          createdAt: updatedFriend.createdAt,
          updatedAt: updatedFriend.updatedAt,
        })
      : null;
  }

  async deleteFriend(id: string): Promise<void> {
    await this.friendRepository.delete(id);
  }

  async find(options?: any): Promise<FriendEntity[]> {
    const friends = await this.friendRepository.find(options);
    return friends.map(
      (friend) =>
        new FriendEntity({
          id: friend.id,
          userId: friend.user.id,
          friendId: friend.friend.id,
          status: friend.status as FriendStatus,
          previousStatus: friend.previousStatus
            ? (friend.previousStatus as FriendStatus)
            : undefined,
          createdAt: friend.createdAt,
          updatedAt: friend.updatedAt,
        })
    );
  }

  async findFriendByUserAndFriend(
    userId: string,
    friendId: string
  ): Promise<FriendEntity | null> {
    const friend = await this.friendRepository.findOne({
      where: { user: { id: userId }, friend: { id: friendId } },
      relations: ["user", "friend"],
    });
    return friend
      ? new FriendEntity({
          id: friend.id,
          userId: friend.user.id,
          friendId: friend.friend.id,
          status: friend.status as FriendStatus,
          previousStatus: friend.previousStatus
            ? (friend.previousStatus as FriendStatus)
            : undefined,
          createdAt: friend.createdAt,
          updatedAt: friend.updatedAt,
        })
      : null;
  }

  async getFriendsOfUser(userId: string): Promise<UserEntity[]> {
    const sentFriends = await this.friendRepository.find({
      where: { user: { id: userId }, status: FriendStatus.ACCEPTED },
      relations: ["friend"],
    });
    const receivedFriends = await this.friendRepository.find({
      where: { friend: { id: userId }, status: FriendStatus.ACCEPTED },
      relations: ["user"],
    });

    const friendUsers = [
      ...sentFriends.map((f: any) => new UserEntity(f.friend)),
      ...receivedFriends.map((f: any) => new UserEntity(f.user)),
    ];

    const uniqueFriends = Array.from(
      new Map(friendUsers.map((u) => [u.id, u])).values()
    );
    return uniqueFriends;
  }
}