import { IFriendRepository } from "../../interface/IfriendRequestRepository";
import { FriendEntity } from "../../../domain/entities/FriendRequest";
import { UserEntity } from "../../../domain/entities/user";

export class GetFriendOfStreamertUsecase {
  private friendRepository: IFriendRepository;

  constructor(friendRepository: IFriendRepository) {
    this.friendRepository = friendRepository;
  }

  async execute(userId: string): Promise<UserEntity[] | null> {
    try {
      const existingRequest = await this.friendRepository.getFriendsOfUser(
        userId
      );
      return existingRequest;
    } catch (error: any) {
      return error;
    }
  } 
}
