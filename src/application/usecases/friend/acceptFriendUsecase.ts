import { IFriendRepository } from "../../interface/IfriendRequestRepository";
import { FriendStatus } from "../../../domain/entities/FriendRequest";

export class AcceptFriendRequestUsecase {
  private friendRepository: IFriendRepository;

  constructor(friendRepository: IFriendRepository) {
    this.friendRepository = friendRepository;
  }

  async execute(requesterId: string, accepterId: string): Promise<void> {
    const pendingRequest = await this.friendRepository.findFriendByUserAndFriend(
      requesterId,
      accepterId
    );
    if (!pendingRequest || pendingRequest.status !== FriendStatus.PENDING) {
      throw new Error('No pending friend request found');
    }
    await this.friendRepository.updateFriend(pendingRequest.id!, {
      status: FriendStatus.ACCEPTED
    });
  }
}