import { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import { types as mediasoupTypes } from "mediasoup";
import { createWorkers } from "../../config/Workers/createWorker"; // Your worker setup
import { GetLatestStreamUsecase } from "../../application/usecases/stream/GetLatestStreamuseCase";
import { GetSubscriptionStatus } from "../../application/usecases/subscriptions/getSubscripitonStatusUsecase";
import config from "../../config/config";
import createWebRtcTransportBothKinds from "../../config/createWebRtcTransportKinds"; // Your transport utility
import { GetChannelById } from "../../application/usecases/channel/GetChannelById";
import { GetUserById } from "../../application/usecases/user/GetuserById";

interface Room {
  router: mediasoupTypes.Router;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
  transports: Map<string, mediasoupTypes.WebRtcTransport>;
  hostId: string;
  allowedGuests: Set<string>;
  isLive: boolean;
  scheduledStart?: string;
  recordingUsers: Set<string>;
}

interface Invite {
  roomId: string;
  userId: string;
  token: string;
  expiresAt: number;
}

export class SocketService {
  private io: SocketIOServer;
  private getLatestStreamByChannelId: GetLatestStreamUsecase;
  private subscriptionStatus: GetSubscriptionStatus;
  private getChannelById: GetChannelById;
  private getUserById: GetUserById;
  private workers: mediasoupTypes.Worker[] = [];
  private nextWorkerIndex = 0;
  private rooms: Map<string, Room> = new Map();
  private invites: Map<string, Invite> = new Map();
  constructor(
    io: SocketIOServer,
    getLatestStreamUsecase: GetLatestStreamUsecase,
    getSubscriptionStatusUsecase: GetSubscriptionStatus,
    getChannelByIdUsecase: GetChannelById,
    getUserByIdUsecase: GetUserById
  ) {
    this.io = io;
    this.getLatestStreamByChannelId = getLatestStreamUsecase;
    this.subscriptionStatus = getSubscriptionStatusUsecase;
    this.getChannelById = getChannelByIdUsecase;
    this.getUserById = getUserByIdUsecase;
    this.initialize();
  }

  private async initialize() {
    this.workers = await createWorkers();
    this.setupSocketEvents();
    this.checkScheduledStreams();
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
    const stream = await this.getLatestStreamByChannelId.execute(roomId);
    if (!stream) return false;

    const channel = await this.getChannelById.execute(roomId);
    const isChannelOwner = channel.ownerId === userId;

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
        hostId: channel?.ownerId || "",
        allowedGuests: new Set(),
        isLive: false,
        recordingUsers: new Set(),
      };
      this.rooms.set(roomId, room);
    }

    if (isChannelOwner) return true;
    if (room.allowedGuests.has(userId)) return true;

    const subscriptionStatus = await this.subscriptionStatus.execute(
      userId,
      roomId
    );
    switch (stream.visibility) {
      case "public":
        return true;
      case "private":
        return false;
      case "sub-only":
        return !!subscriptionStatus;
      default:
        return false;
    }
  }

  private async inviteGuest(
    roomId: string,
    hostId: string,
    guestId: string
  ): Promise<string | null> {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostId) return null;

    const guestUser = await this.getUserById.execute(guestId);
    if (!guestUser) return null;

    room.allowedGuests.add(guestId);
    const token = Math.random().toString(36).substring(2);
    const invite: Invite = {
      roomId,
      userId: guestId,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    this.invites.set(token, invite);
    this.io.to(roomId).emit("guestAdded", { guestId });
    return `localhost:3001/dashboard/streamer/live/join?token=${token}`;
  }

  private checkScheduledStreams() {
    setInterval(() => {
      const now = new Date();
      this.rooms.forEach((room, roomId) => {
        if (
          room.scheduledStart &&
          !room.isLive &&
          new Date(room.scheduledStart) <= now
        ) {
          this.io.to(roomId).emit("startScheduledStream", { roomId });
          room.scheduledStart = undefined; // Clear schedule after triggering
        }
      });
    }, 10000);
  }

  private setupSocketEvents() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`New client connected: ${socket.id}`);

      // Join Room
      socket.on("joinRoom", async ({ roomId, userId }, callback) => {
        const permission = await this.canUserJoinRoom(userId, roomId);
        if (!permission) {
          socket.emit("error", { message: "Permission denied" });
          socket.disconnect(true);
          return;
        }

        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);
        callback({ success: true });
      });

      // Verify Invite
      socket.on("verifyInvite", ({ token }, callback) => {
        const invite = this.invites.get(token);
        if (!invite || invite.expiresAt < Date.now()) {
          callback({ success: false, message: "Invalid or expired invite" });
          return;
        }
        callback({ success: true, roomId: invite.roomId });
      });

      // Generate Invite Link
      socket.on("generateInvite", ({ roomId, userId }, callback) => {
        const room = this.rooms.get(roomId);
        if (!room || room.hostId !== userId) {
          callback({ error: "Unauthorized" });
          return;
        }
        this.inviteGuest(roomId, userId, "guest_" + Date.now()).then(
          (inviteLink) => {
            callback({ inviteLink });
          }
        );
      });

      // Get Router RTP Capabilities
      socket.on("getRouterRtpCapabilities", (_, callback) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = this.rooms.get(roomId);
        if (room) {
          callback(room.router.rtpCapabilities);
        } else {
          callback({ error: "Room not found" });
        }
      });

      // Create Producer Transport
      socket.on("createProducerTransport", (_, callback) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = this.rooms.get(roomId);
        if (!room) return callback({ error: "Room not found" });

        createWebRtcTransportBothKinds(room.router).then(
          ({ transport, clientTransportParams }) => {
            room.transports.set(transport.id, transport);
            transport.on("dtlsstatechange", (dtlsState) => {
              if (dtlsState === "closed") {
                transport.close();
                room.transports.delete(transport.id);
              }
            });
            callback(clientTransportParams);
          }
        );
      });

      // Connect Producer Transport
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

      // Produce Media
      socket.on(
        "produce",
        async ({ transportId, kind, rtpParameters, roomId }, callback) => {
          const room = this.rooms.get(roomId);
          if (!room) return callback({ error: "Room not found" });

          const transport = room.transports.get(transportId);
          if (!transport) return callback({ error: "Transport not found" });

          const producer = await transport.produce({ kind, rtpParameters });
          room.producers.set(producer.id, producer);
          this.io.to(roomId).emit("newProducer", { producerId: producer.id });
          callback({ id: producer.id });
        }
      );

      socket.on("createConsumerTransport", async (_, callback) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = this.rooms.get(roomId);
        if (!room) return callback({ error: "Room not found" });

        const { transport, clientTransportParams } =
          await createWebRtcTransportBothKinds(room.router);
        room.transports.set(transport.id, transport);
        callback(clientTransportParams);
      });

      socket.on(
        "connectConsumerTransport",
        async ({ transportId, dtlsParameters, roomId }, callback) => {
          const room = this.rooms.get(roomId);
          if (!room) return callback({ error: "Room not found" });

          const transport = room.transports.get(transportId);
          if (transport) {
            await transport.connect({ dtlsParameters });
            callback({ success: true });
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
          if (!room || !room.router.canConsume({ producerId, rtpCapabilities }))
            return;

          const transport = room.transports.get(transportId);
          if (!transport) return;

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

      // Start Stream
      socket.on("startStream", ({ roomId }) => {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.isLive = true;
        this.io.to(roomId).emit("streamStarted", { roomId });
      });

      // Stop Stream
      socket.on("stopStream", ({ roomId }) => {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.isLive = false;
        room.producers.forEach((producer) => producer.close());
        room.producers.clear();
        this.io.to(roomId).emit("streamStopped", { roomId });
      });

      // Streamer Left
      socket.on("streamerLeft", ({ roomId }) => {
        const room = this.rooms.get(roomId);
        if (!room) return;

        this.io.to(roomId).emit("streamerLeft", { roomId });
      });

      // Start Recording
      socket.on("startRecording", ({ roomId }) => {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const userId = socket.handshake.auth.userId;
        room.recordingUsers.add(userId);
        this.io.to(roomId).emit("recordingStarted", { userId });
      });

      // Stop Recording
      socket.on("stopRecording", ({ roomId }) => {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const userId = socket.handshake.auth.userId;
        room.recordingUsers.delete(userId);
        this.io.to(roomId).emit("recordingStopped", { userId });
      });

      // Recording Available
      socket.on("recordingAvailable", ({ roomId, url }) => {
        this.io.to(roomId).emit("recordingAvailable", { url });
      });

      // Chat Message
      socket.on("chatMessage", ({ roomId, message }) => {
        this.io.to(roomId).emit("chatMessage", message);
      });

      // Private Message
      socket.on("privateMessage", ({ roomId, message, userId }) => {
        const room = this.rooms.get(roomId);
        if (!room) return;

        this.io
          .to(room.hostId)
          .emit("privateMessage", { message, from: userId });
      });

      // Schedule Stream
      socket.on("scheduleStream", ({ roomId, scheduleTime }) => {
        const room = this.rooms.get(roomId);
        if (!room || room.hostId !== socket.handshake.auth.userId) return;

        room.scheduledStart = scheduleTime;
        this.io.to(roomId).emit("streamScheduled", { scheduleTime });
      });

      // Cancel Schedule
      socket.on("cancelSchedule", ({ roomId }) => {
        const room = this.rooms.get(roomId);
        if (!room || room.hostId !== socket.handshake.auth.userId) return;

        room.scheduledStart = undefined;
        this.io.to(roomId).emit("scheduleCancelled");
      });

      // Disconnect
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        const roomId = Array.from(socket.rooms)[1];
        if (roomId) {
          const room = this.rooms.get(roomId);
          if (
            room &&
            room.hostId === socket.handshake.auth.userId &&
            room.isLive
          ) {
            this.io.to(roomId).emit("streamerLeft", { roomId });
            room.isLive = false;
          }
        }
      });
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
