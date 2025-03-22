import { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import { types as mediasoupTypes } from "mediasoup";
import { createWorkers } from "../../config/Workers/createWorker";
import { GetLatestStreamUsecase } from "../../application/usecases/stream/GetLatestStreamuseCase";
import { GetSubscriptionStatus } from "../../application/usecases/subscriptions/getSubscripitonStatusUsecase";
import config from "../../config/config";
import createWebRtcTransportBothKinds from "../../config/createWebRtcTransportKinds";
import { GetChannelById } from "../../application/usecases/channel/GetChannelById";
import { GetUserById } from "../../application/usecases/user/GetuserById";
import { InviteRepository } from "../repositories/inviteRepository";
import { v4 as uuidv4 } from "uuid";

export class SocketService {
  constructor(
    io: SocketIOServer,
    getLatestStreamUsecase: GetLatestStreamUsecase,
    getSubscriptionStatusUsecase: GetSubscriptionStatus,
    getChannelByIdUsecase: GetChannelById,
    getUserByIdUsecase: GetUserById,
    inviteRepository: InviteRepository
  ) {}
}
