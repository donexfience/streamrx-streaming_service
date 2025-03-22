import { IUserRepository } from "../../interface/IUserRepository";
import { IFriendRepository } from "../../interface/IfriendRequestRepository";
import { UserEntity } from "../../../domain/entities/user";
import { FriendStatus } from "../../../domain/entities/FriendRequest";

export class GetStreamersUsecase {
  private userRepository: IUserRepository;
  private friendRepository: IFriendRepository;

  constructor(
    userRepository: IUserRepository,
    friendRepository: IFriendRepository
  ) {
    this.userRepository = userRepository;
    this.friendRepository = friendRepository;
  }
  async execute(
    currentUserId: string,
    page: number,
    limit: number,
    search?: string,
    startDate?: string,
    endDate?: string
  ): Promise<UserEntity[]> {
    const streamers: any = await this.userRepository.findStreamers(
      page,
      currentUserId,
      limit,

      search,
      startDate,
      endDate
    );

    const sentRequests = await this.friendRepository.find({
      where: { user: { id: currentUserId } },
      relations: ["user", "friend"],
    });

    const receivedRequests = await this.friendRepository.find({
      where: { friend: { id: currentUserId } },
      relations: ["user", "friend"],
    });

    console.log(sentRequests, "sendtrequuest", receivedRequests);

    return streamers.map((streamer: any) => {
      const sentRequest = sentRequests.find((r) => r.friendId === streamer.id);
      const receivedRequest = receivedRequests.find(
        (r) => r.userId === streamer.id
      );
      console.log(streamers, "streams before returning in the usecase");

      return {
        ...streamer,
        friendshipStatus: this.getFriendshipStatus(
          sentRequest,
          receivedRequest
        ),
      };
    });
  }

  private getFriendshipStatus(sentRequest: any, receivedRequest: any) {
    if (sentRequest) {
      if (sentRequest.status === FriendStatus.PENDING) {
        return "PENDING_SENT";
      }
      return sentRequest.status;
    }
    if (receivedRequest) {
      if (receivedRequest.status === FriendStatus.PENDING) {
        return "PENDING_RECEIVED";
      }
      if (receivedRequest.status === FriendStatus.BLOCKED) {
        return "BLOCKED_BY_THEM";
      }
      return receivedRequest.status;
    }
    return "NONE";
  }
}
