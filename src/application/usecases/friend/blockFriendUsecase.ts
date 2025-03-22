import { IFriendRepository } from "../../interface/IfriendRequestRepository";
import {
  FriendEntity,
  FriendStatus,
} from "../../../domain/entities/FriendRequest";

export class BlockFriendUsecase {
  private friendRepository: IFriendRepository;

  constructor(friendRepository: IFriendRepository) {
    this.friendRepository = friendRepository;
  }

  async execute(
    blockerId: string,
    blockedId: string
  ): Promise<FriendEntity | null> {
    let existingRelation =
      await this.friendRepository.findFriendByUserAndFriend(
        blockerId,
        blockedId
      );
    const reverseRelation =
      await this.friendRepository.findFriendByUserAndFriend(
        blockedId,
        blockerId
      );

    if (existingRelation) {
      if (existingRelation.status === FriendStatus.BLOCKED) {
        if (existingRelation.previousStatus) {
          await this.friendRepository.updateFriend(existingRelation.id!, {
            status: existingRelation.previousStatus,
            previousStatus: null,
          });
          return await this.friendRepository.findFriendByUserAndFriend(
            blockerId,
            blockedId
          );
        } else {
          await this.friendRepository.deleteFriend(existingRelation.id!);
          return null;
        }
      } else {
        await this.friendRepository.updateFriend(existingRelation.id!, {
          previousStatus: existingRelation.status,
          status: FriendStatus.BLOCKED,
        });
        if (reverseRelation) {
          await this.friendRepository.updateFriend(reverseRelation.id!, {
            status: FriendStatus.REJECTED,
          });
        }
        return await this.friendRepository.findFriendByUserAndFriend(
          blockerId,
          blockedId
        );
      }
    } else {
      const blockRelation = new FriendEntity({
        userId: blockerId,
        friendId: blockedId,
        status: FriendStatus.BLOCKED,
        previousStatus: null,
      });
      const createdRelation = await this.friendRepository.createFriend(
        blockRelation
      );
      if (reverseRelation) {
        await this.friendRepository.updateFriend(reverseRelation.id!, {
          status: FriendStatus.REJECTED,
        });
      }
      return createdRelation;
    }
  }
}
