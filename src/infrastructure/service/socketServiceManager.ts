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

interface Room {
  router: mediasoupTypes.Router;
  producers: Map<string, mediasoupTypes.Producer>;
  consumers: Map<string, mediasoupTypes.Consumer>;
  transports: Map<string, mediasoupTypes.WebRtcTransport>;
  hostId: string;
  hostSocketId: string | null;
  allowedGuests: Set<string>;
  isLive: boolean;
  scheduledStart?: string;
  recordingUsers: Set<string>;
  participants: Map<string, { name: string; role: "host" | "guest" }>;
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
  private inviteRepository: InviteRepository;
  constructor(
    io: SocketIOServer,
    getLatestStreamUsecase: GetLatestStreamUsecase,
    getSubscriptionStatusUsecase: GetSubscriptionStatus,
    getChannelByIdUsecase: GetChannelById,
    getUserByIdUsecase: GetUserById,
    inviteRepository: InviteRepository
  ) {
    this.io = io;
    this.getLatestStreamByChannelId = getLatestStreamUsecase;
    this.subscriptionStatus = getSubscriptionStatusUsecase;
    this.getChannelById = getChannelByIdUsecase;
    this.getUserById = getUserByIdUsecase;
    this.inviteRepository = new InviteRepository();
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
    roomId: string,
    socket: Socket
  ): Promise<boolean> {
    const stream = await this.getLatestStreamByChannelId.execute(roomId);
    if (!stream) return false;

    const channel = await this.getChannelById.execute(roomId);
    console.log(channel, "channel in can user join room");
    const isChannelOwner = channel.ownerId === userId;
    console.log(isChannelOwner, "is channel owner");
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
        hostId: channel?.ownerId,
        allowedGuests: new Set(),
        hostSocketId: null,
        isLive: false,
        recordingUsers: new Set(),
        participants: new Map(),
      };
      this.rooms.set(roomId, room);
    }

    if (isChannelOwner) {
      socket.handshake.auth.role = "host";
      return true;
    }
    console.log(socket.handshake.auth.role, "socket.handshake.auth.role");
    if (isChannelOwner && room.hostId === userId) {
      socket.handshake.auth.role = "host";
      return true;
    } else if (isChannelOwner && room.hostId !== userId) {
      socket.emit("error", { message: "Another host is already in this room" });
      return false;
    }
    const inviteToken = socket.handshake.auth.token as string;
    console.log(inviteToken, "invite token");
    const invite = await this.inviteRepository.findByToken(inviteToken);
    console.log(invite, "invite got from backend");
    if (
      invite &&
      invite.expiresAt > new Date() &&
      invite.channelId === roomId
    ) {
      room.allowedGuests.add(userId);
      socket.handshake.auth.role = "guest";
      return true;
    }
    if (socket.handshake.auth.role === "guest") {
      console.log("in teh if of guest role");
      const inviteToken = socket.handshake.auth.token as string;
      const invite = await this.inviteRepository.findByToken(inviteToken);
      if (
        invite &&
        invite.expiresAt > new Date() &&
        invite.channelId === roomId
      ) {
        room.allowedGuests.add(userId);
        await this.inviteRepository.deleteInvite(inviteToken);
        socket.handshake.auth.role = "guest";
        return true;
      }
      return false;
    }

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
    hostId: string
  ): Promise<string | null> {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostId) return null;
    console.log("first if passed");

    const guestId = uuidv4();
    room.allowedGuests.add(guestId);
    const token = Math.random().toString(36).substring(2);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log(token, expiresAt, "token and expires at");

    const invite = await this.inviteRepository.createInvite(
      token,
      roomId,
      expiresAt
    );
    console.log(invite, "invite created");

    return `localhost:3001/dashboard/streamer/live?token=${token}&guestId=${guestId}`;
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
          room.scheduledStart = undefined;
        }
      });
    }, 10000);
  }

  private async cleanupExpiredInvites() {
    setInterval(async () => {
      await this.inviteRepository.deleteExpiredInvites();
    }, 60 * 60 * 1000);
  }

  private setupSocketEvents() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`New client connected: ${socket.id}`);

      // Join Room
      socket.on(
        "joinRoom",
        async ({ roomId, userId, guestId, guestName }, callback) => {   
          const permission = await this.canUserJoinRoom(userId, roomId, socket);
          if (!permission) {
            socket.emit("error", { message: "Permission denied" });
            return;
          }
          socket.data.userId = userId;
          socket.data.userId = guestId || userId;
          socket.data.role = socket.handshake.auth.role;
          socket.join(roomId);
          const room = this.rooms.get(roomId);
          if (!room) return;

          if (socket.handshake.auth.role === "guest" && !room.hostId) {
            socket.emit("joinDenied", {
              message: "Host not present. Please wait.",
            });
            return;
          }
          if (guestId && guestName) {
            socket.data.guestName = guestName;
            room.participants.set(guestId, { name: guestName, role: "guest" });
            this.io.to(roomId).emit("guestAdded", { guestId, guestName });
          } else if (
            socket.data.role === "host" &&
            !room.participants.has(userId)
          ) {
            room.hostSocketId = socket.id;
            room.participants.set(userId, { name: "Host", role: "host" });
          }

          const producers = Array.from(room.producers.entries()).map(
            ([producerId, producer]) => ({
              producerId,
              userId: producer.appData.userId || socket.data.userId,
            })
          );
          socket.emit("existingProducers", { producers });
          this.io.to(roomId).emit(
            "participantsUpdated",
            Array.from(room.participants.entries()).map(([userId, data]) => ({
              userId,
              ...data,
            }))
          );
          callback({ success: true });
        }
      );

      // Verify Invite
      socket.on("verifyInvite", async ({ token }, callback) => {
        const invite = await this.inviteRepository.findByToken(token);
        if (!invite || invite.expiresAt < new Date()) {
          callback({ success: false, message: "Invalid or expired invite" });
          return;
        }
        console.log("verifiication on going ----------------------------");
        callback({ success: true, roomId: invite.channelId });
        console.log(
          "verification ongoing and completed -----------------",
          invite.channelId
        );
      });

      // Generate Invite Link
      socket.on("generateInvite", ({ roomId, userId }, callback) => {
        if (socket.handshake.auth.role !== "host") {
          callback({ error: "Only the host can invite guests" });
          return;
        }
        const room = this.rooms.get(roomId);
        if (!room || room.hostId !== userId) {
          callback({ error: "Unauthorized" });
          return;
        }
        this.inviteGuest(roomId, userId).then((inviteLink) => {
          console.log(inviteLink, "invite link generated");
          callback({ inviteLink });
        });
      });

      socket.on("removeGuest", ({ roomId, guestId }, callback) => {
        const room = this.rooms.get(roomId);
        if (!room || room.hostId !== socket.handshake.auth.userId) {
          callback({ error: "Unauthorized" });
          return;
        }

        room.allowedGuests.delete(guestId);
        this.io.to(roomId).emit("guestRemoved", { guestId });
        callback({ success: true });
      });

      // Get Router RTP Capabilities
      socket.on("getRouterRtpCapabilities", (_, callback) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = this.rooms.get(roomId);
        console.log(room, "room in get router rtp capabilities");
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
          console.log(transport, "transport connected");
          if (transport) {
            await transport.connect({ dtlsParameters });
            console.log("producer transport connected");
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
          console.log(producer, "producer created");
          producer.appData = { userId: socket.data.userId };
          console.log(socket.data.userId, "socket data user id");
          room.producers.set(producer.id, producer);
          this.io.to(roomId).emit("newProducer", {
            producerId: producer.id,
            userId: socket.data.userId,
          });
          callback({ id: producer.id });
        }
      );

      socket.on("createConsumerTransport", async (_, callback) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = this.rooms.get(roomId);
        if (!room) return callback({ error: "Room not found" });

        const { transport, clientTransportParams } =
          await createWebRtcTransportBothKinds(room.router);
        transport.appData = { userId: socket.data.userId };
        room.transports.set(transport.id, transport);
        console.log(
          "transport created",
          transport.id,
          "consumer transport created"
        );
        transport.on("dtlsstatechange", (dtlsState) => {
          if (dtlsState === "closed") {
            room.consumers.forEach((consumer: any, consumerId: any) => {
              if (consumer.transport === transport) {
                consumer.close();
                room.consumers.delete(consumerId);
              }
            });
            transport.close();
            room.transports.delete(transport.id);
          }
        });
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
            appData: { socketId: socket.id, userId: socket.data.userId },
          });
          room.consumers.set(consumer.id, consumer);
          console.log(room.consumers, "consumers in consume");
          callback({
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });
        }
      );
      socket.on("startStream", ({ roomId }) => {
        const room = this.rooms.get(roomId);
        if (
          !room ||
          room.hostId !== socket.handshake.auth.userId ||
          socket.handshake.auth.role !== "host"
        ) {
          socket.emit("error", {
            message: "Only the host can start the stream",
          });
          return;
        }
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

        this.io
          .to(roomId)
          .emit("streamerLeft", { roomId, hostId: room.hostId });
        room.isLive = false;
      });

      //request approval system

      socket.on("requestJoin", ({ roomId, userId }) => {
        console.log("inside the requstjoin event ");

        const room = this.rooms.get(roomId);
        console.log(room, "roommmmmmmmmmmmmmmmmmmmmmm ,in the join req");
        if (!room || !room.hostSocketId) {
          socket.emit("joinDenied", { message: "No host present" });
          return;
        }
        console.log(
          `Emitting joinRequest to host ${room.hostSocketId} for guest ${userId}`
        );
        this.io.to(room.hostSocketId).emit("joinRequest", {
          guestId: userId,
          guestSocketId: socket.id,
        });
      });

      socket.on("approveJoin", ({ roomId, guestId, guestSocketId }) => {
        const room = this.rooms.get(roomId);
        if (!room || room.hostId !== socket.handshake.auth.userId) {
          socket.emit("error", { message: "Unauthorized" });
          return;
        }
        room.allowedGuests.add(guestId);
        this.io.to(guestSocketId).emit("joinApproved");
      });
      socket.on("denyJoin", ({ roomId, guestId }) => {
        const room = this.rooms.get(roomId);
        if (room && room.hostId === socket.data.userId) {
          const guestSocket = this.io.sockets.sockets.get(guestId);
          if (guestSocket) {
            guestSocket.emit("joinDenied", { message: "Rejected by host" });
          }
        }
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
        const sender =
          socket.data.role === "host"
            ? "Host"
            : socket.data.guestName || "Guest";
        socket.to(roomId).emit("chatMessage", { ...message, sender });
      });

      socket.on(
        "privateMessage",
        ({ roomId, message, userId, targetUserId }) => {
          const room = this.rooms.get(roomId);
          if (!room) return;
          const sender =
            socket.data.role === "host"
              ? "Host"
              : socket.data.guestName || "Guest";
          const messagePayload = {
            message: message.message,
            from: userId,
            sender,
          };
          if (targetUserId && room.hostId === userId) {
            this.io.to(targetUserId).emit("privateMessage", messagePayload);
          } else {
            this.io.to(room.hostId).emit("privateMessage", messagePayload);
          }
        }
      );
      //remvove guest

      socket.on("removeGuest", ({ roomId, guestId }, callback) => {
        const room = this.rooms.get(roomId);
        if (!room || room.hostId !== socket.data.userId) {
          callback({ error: "Unauthorized" });
          return;
        }
        room.allowedGuests.delete(guestId);
        room.participants.delete(guestId);
        this.io.to(roomId).emit("guestRemoved", { guestId });
        this.io.to(roomId).emit(
          "participantsUpdated",
          Array.from(room.participants.entries()).map(([userId, data]) => ({
            userId,
            ...data,
          }))
        );
        callback({ success: true });
      });

      socket.on("resume", async ({ producerId }, callback) => {
        const roomId = Array.from(socket.rooms)[1];
        const room = this.rooms.get(roomId);

        if (!room) {
          callback({ error: "Room not found" });
          return;
        }
        const consumer = Array.from(room.consumers.values()).find(
          (c) => c.producerId === producerId && c.appData.socketId === socket.id
        );

        console.log(consumer, "consumer in resume");

        if (!consumer) {
          console.warn(
            `No consumer found for producerId: ${producerId}, socket: ${socket.id}`
          );
          callback({ error: "Consumer not found" });
          return;
        }

        try {
          if (consumer.closed) {
            callback({ error: "Consumer is closed" });
            return;
          }
          if (!consumer.paused) {
            callback({ error: "Consumer is not paused" });
            return;
          }

          await consumer.resume();
          console.log(
            `Consumer ${consumer.id} resumed for socket ${socket.id}`
          );
          callback({ success: true });
        } catch (error) {
          console.error(`Error resuming consumer ${consumer.id}:`, error);
          callback({ error: "Failed to resume consumer" });
        }
      });

      // Disconnect
      socket.on("disconnect", () => {
        const roomId = Array.from(socket.rooms)[1];
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (!room) return;

        if (room.hostId === socket.data.userId && room.isLive) {
          room.hostSocketId = null;
          this.io.to(roomId).emit("streamerLeft", { roomId });
          room.isLive = false;
        } else if (socket.data.role === "guest") {
          room.participants.delete(socket.data.userId);
          room.allowedGuests.delete(socket.data.userId);
          const closedProducerIds: string[] = [];
          room.producers.forEach((producer, producerId) => {
            if (producer.appData.userId === socket.data.userId) {
              producer.close();
              room.producers.delete(producerId);
              closedProducerIds.push(producerId);
            }
          });
          this.io
            .to(roomId)
            .emit("producerClosed", { producerIds: closedProducerIds });
          this.io
            .to(roomId)
            .emit("guestRemoved", { guestId: socket.data.userId });
          this.io.to(roomId).emit(
            "participantsUpdated",
            Array.from(room.participants.entries()).map(([userId, data]) => ({
              userId,
              ...data,
            }))
          );
        }
      });
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
