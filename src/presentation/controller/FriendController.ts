import { GetFriendOfStreamertUsecase } from "./../../application/usecases/friend/GetFriendUsecaseById";
import { Request, Response } from "express";
import { UserRepository } from "../../infrastructure/repositories/userRepostiory";
import { FriendRepository } from "../../infrastructure/repositories/FriendRepository";
import { GetStreamersUsecase } from "../../application/usecases/user/GetStreamerUsecase";
import { SendFriendRequestUsecase } from "../../application/usecases/friend/sendFriendUsecase";
import { AcceptFriendRequestUsecase } from "../../application/usecases/friend/acceptFriendUsecase";
import { BlockFriendUsecase } from "../../application/usecases/friend/blockFriendUsecase";

export class FriendController {
  private getStreamersUsecase: GetStreamersUsecase;
  private sendFriendRequestUsecase: SendFriendRequestUsecase;
  private acceptFriendRequestUsecase: AcceptFriendRequestUsecase;
  private blockFriendUsecase: BlockFriendUsecase;
  private GetFriendOfStreamertUsecase: GetFriendOfStreamertUsecase;

  constructor() {
    const userRepository = new UserRepository();
    const friendRepository = new FriendRepository();

    this.getStreamersUsecase = new GetStreamersUsecase(
      userRepository,
      friendRepository
    );
    this.sendFriendRequestUsecase = new SendFriendRequestUsecase(
      friendRepository
    );
    this.acceptFriendRequestUsecase = new AcceptFriendRequestUsecase(
      friendRepository
    );
    this.blockFriendUsecase = new BlockFriendUsecase(friendRepository);
    this.GetFriendOfStreamertUsecase = new GetFriendOfStreamertUsecase(
      friendRepository
    );
  }

  async getStreamers(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = req.params.userId;
      if (!currentUserId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (startDate && isNaN(Date.parse(startDate))) {
        res.status(400).json({ message: "Invalid start date format" });
        return;
      }
      if (endDate && isNaN(Date.parse(endDate))) {
        res.status(400).json({ message: "Invalid end date format" });
        return;
      }

      const streamers = await this.getStreamersUsecase.execute(
        currentUserId,
        page,
        limit,
        search,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: streamers,
        pagination: {
          page,
          limit,
          hasMore: streamers.length === limit,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  /**
   * Send a friend request to another streamer
   */
  async sendFriendRequest(req: Request, res: Response): Promise<void> {
    try {
      const requesterId = req.params.userId;
      const { friendId } = req.body;

      if (!requesterId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }

      if (!friendId) {
        res.status(400).json({ message: "Accepter ID is required" });
        return;
      }

      const friendRequest = await this.sendFriendRequestUsecase.execute(
        requesterId,
        friendId
      );

      res.status(201).json({
        success: true,
        data: friendRequest,
      });
    } catch (error) {
      const statusCode =
        error instanceof Error && error.message.includes("already exists")
          ? 409
          : 500;

      res.status(statusCode).json({
        success: false,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  /**
   * Accept a pending friend request
   */
  async acceptFriendRequest(req: Request, res: Response): Promise<void> {
    try {
      const accepterId = req.params.userId;
      const requesterId = req.body.friendId;

      if (!accepterId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }

      if (!requesterId) {
        res.status(400).json({ message: "Requester ID is required" });
        return;
      }

      await this.acceptFriendRequestUsecase.execute(requesterId, accepterId);

      res.status(200).json({
        success: true,
        message: "Friend request accepted",
      });
    } catch (error) {
      const statusCode =
        error instanceof Error &&
        error.message.includes("No pending friend request")
          ? 404
          : 500;

      res.status(statusCode).json({
        success: false,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  async blockFriend(req: Request, res: Response): Promise<void> {
    try {
      const blockerId = req.params.userId;
      const blockedId = req.body.friendId;

      if (!blockerId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }

      if (!blockedId) {
        res.status(400).json({ message: "Blocked user ID is required" });
        return;
      }

      const block = await this.blockFriendUsecase.execute(blockerId, blockedId);

      if (block === null) {
        res.status(200).json({
          success: true,
          message: "User unblocked and relation removed",
        });
      } else {
        res.status(200).json({
          success: true,
          data: block,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
  async getFriendOfStreamer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;

      if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }

      const user = await this.GetFriendOfStreamertUsecase.execute(userId);
      res.status(201).json({
        success: true,
        user,
        message: "friends of user fetch successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}
