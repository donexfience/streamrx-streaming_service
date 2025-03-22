import { IFriendRepository } from "../../interface/IfriendRequestRepository";
import { FriendEntity, FriendStatus } from "../../../domain/entities/FriendRequest";

export class SendFriendRequestUsecase {
  private friendRepository: IFriendRepository;

  constructor(friendRepository: IFriendRepository) {
    this.friendRepository = friendRepository;
  }

  async execute(requesterId: string, accepterId: string): Promise<FriendEntity> {
    const existingRequest = await this.friendRepository.findFriendByUserAndFriend(
      requesterId, 
      accepterId
    );
  
    if (existingRequest) {
      throw new Error('Friend request already exists');
    }
  
    const reverseRequest = await this.friendRepository.findFriendByUserAndFriend(
      accepterId,
      requesterId
    );
  
    if (reverseRequest) {
      throw new Error('A friend request from the other user already exists');
    }
  
    const friendRequest = new FriendEntity({
      userId: requesterId,
      friendId: accepterId,
      status: FriendStatus.PENDING
    });
  
    return await this.friendRepository.createFriend(friendRequest);
  }
}