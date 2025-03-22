import { UserEntity } from "../../domain/entities/user";
import { FriendEntity } from "../../domain/entities/FriendRequest";

export interface IFriendRepository {
  createFriend(friend: FriendEntity): Promise<FriendEntity>;
  updateFriend(
    id: string,
    friend: Partial<FriendEntity>
  ): Promise<FriendEntity | null>;
  find(options?: any): Promise<FriendEntity[]>;
  findFriendByUserAndFriend(
    userId: string,
    friendId: string
  ): Promise<FriendEntity | null>;
  getFriendsOfUser(userId: string): Promise<UserEntity[]>;
  deleteFriend(id: string): Promise<void>;
}
