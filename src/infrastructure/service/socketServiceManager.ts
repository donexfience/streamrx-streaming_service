import { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import { types as mediasoupTypes } from "mediasoup";
import { createWorkers } from "../../config/Workers/createWorker";
import { GetLatestStreamUsecase } from "../../application/usecases/stream/GetLatestStreamuseCase";
import { GetSubscriptionStatus } from "../../application/usecases/subscriptions/getSubscripitonStatusUsecase";
import config from "../../config/config";
import createWebRtcTransportBothKinds from "../../config/createWebRtcTransportKinds";
import { GetChannelById } from "../../application/usecases/channel/GetChannelById";

interface Room {
  router: mediasoupTypes.Router;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
  transports: Map<string, mediasoupTypes.WebRtcTransport>;
}

export class SocketService {
  private io: SocketIOServer;
  private getLatestStreamBychannelId: GetLatestStreamUsecase;
  private SubscriptoinStatus: GetSubscriptionStatus;
  private GetChannelById: GetChannelById;
  private workers: mediasoupTypes.Worker[] = [];
  private nextWorkerIndex = 0;
  private rooms: Map<string, Room> = new Map();

  constructor(
    io: SocketIOServer,
    GetLatestStreamUsecase: GetLatestStreamUsecase,
    GetSubscriptionStatusUsecase: GetSubscriptionStatus,
    GetChannelByIdUsecase: GetChannelById
  ) {
    this.io = io;
    this.initialize();
    this.getLatestStreamBychannelId = GetLatestStreamUsecase;
    this.SubscriptoinStatus = GetSubscriptionStatusUsecase;
    this.GetChannelById = GetChannelByIdUsecase;
  }

  private async initialize() {
    this.workers = await createWorkers();
    this.setupSocketEvents();
  }

  private getNextWorker(): mediasoupTypes.Worker {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  private async canUserJoinRoom(
    userId: string,
    roomId: string
  ): Promise<boolean> {
    const stream = await this.getLatestStreamBychannelId.execute(roomId);
    const subscriptionStatus = await this.SubscriptoinStatus.execute(
      userId,
      roomId
    );
    const channel = await this.GetChannelById.execute(roomId);
    if (!stream) return false;

    switch (stream.visibility) {
      case "public":
        return true;
      case "private":
        return channel.id === userId;
      case "sub-only":
        return !!subscriptionStatus;
      default:
        return false;
    }
  }

  private setupSocketEvents() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`New client connected: ${socket.id}`);

      socket.on(
        "joinRoom",
        async ({ roomId, userId }: { roomId: string; userId: string }) => {
          if (!(await this.canUserJoinRoom(userId, roomId))) {
            socket.emit("error", {
              message: "You do not have permission to join this stream",
            });
            socket.disconnect(true);
            return;
          }

          let room = this.rooms.get(roomId);
          if (!room) {
            const worker = this.getNextWorker();
            const router = await worker.createRouter({
              mediaCodecs: config.routerMediaCodecs as any,
            });
            room = {
              router,
              producers: new Map(),
              consumers: new Map(),
              transports: new Map(),
            };
            this.rooms.set(roomId, room);
          }

          socket.join(roomId);
          console.log(`User ${userId} joined room ${roomId}`);
        }
      );

      socket.on("getRouterRtpCapabilities", (_, callback) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = this.rooms.get(roomId);
        if (room) {
          callback(room.router.rtpCapabilities);
        }
      });

      socket.on("createProducerTransport", async (_, callback) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = this.rooms.get(roomId);
        if (!room) return;

        const { transport, clientTransportParams } =
          await createWebRtcTransportBothKinds(room.router);
        room.transports.set(transport.id, transport);

        transport.on(
          "dtlsstatechange",
          (dtlsState: mediasoupTypes.DtlsState) => {
            if (dtlsState === "closed") {
              transport.close();
              room.transports.delete(transport.id);
            }
          }
        );

        callback(clientTransportParams);
      });

      socket.on(
        "connectProducerTransport",
        async ({ transportId, dtlsParameters, roomId }, callback) => {
          const room = this.rooms.get(roomId);
          if (!room) return callback({ error: "Room not found" });

          const transport = room.transports.get(transportId);
          if (transport) {
            await transport.connect({ dtlsParameters });
            callback({ success: true });
          } else {
            callback({ error: "Transport not found" });
          }
        }
      );

      socket.on(
        "produce",
        async ({ transportId, kind, rtpParameters, roomId }, callback) => {
          const room = this.rooms.get(roomId);
          if (!room) return;

          const transport = room.transports.get(transportId);
          if (!transport) return;

          const producer = await transport.produce({ kind, rtpParameters });
          room.producers.set(producer.id, producer);
          this.io.to(roomId).emit("newProducer", { producerId: producer.id });
          callback({ id: producer.id });
        }
      );

      socket.on("createConsumerTransport", async (_, callback) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = this.rooms.get(roomId);
        if (!room) return;

        const { transport, clientTransportParams } =
          await createWebRtcTransportBothKinds(room.router);
        room.transports.set(transport.id, transport);

        transport.on(
          "dtlsstatechange",
          (dtlsState: mediasoupTypes.DtlsState) => {
            if (dtlsState === "closed") {
              transport.close();
              room.transports.delete(transport.id);
            }
          }
        );

        callback(clientTransportParams);
      });

      socket.on(
        "connectConsumerTransport",
        async ({ dtlsParameters, transportId }, callback) => {
          const roomId = Array.from(socket.rooms)[1];
          const room = this.rooms.get(roomId);
          if (!room) return;

          const transport = room.transports.get(transportId);
          if (transport) {
            await transport.connect({ dtlsParameters });
            callback();
          }
        }
      );

      socket.on(
        "consume",
        async (
          { producerId, rtpCapabilities, transportId, roomId },
          callback
        ) => {
          const room = this.rooms.get(roomId);
          if (!room) return;

          const transport = room.transports.get(transportId);
          if (
            !transport ||
            !room.router.canConsume({ producerId, rtpCapabilities })
          )
            return;

          const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
          });
          room.consumers.set(consumer.id, consumer);

          callback({
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });
        }
      );

      socket.on("chatMessage", ({ roomId, message }) => {
        this.io.to(roomId).emit("chatMessage", message);
      });

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
