import { InviteRepository } from "./../repositories/inviteRepository";
import { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import { types as mediasoupTypes } from "mediasoup";
import { createWorkers } from "../../config/Workers/createWorker";
import { GetLatestStreamUsecase } from "../../application/usecases/stream/GetLatestStreamuseCase";
import { GetSubscriptionStatus } from "../../application/usecases/subscriptions/getSubscripitonStatusUsecase";
import { GetChannelById } from "../../application/usecases/channel/GetChannelById";
import { GetUserById } from "../../application/usecases/user/GetuserById";
import { v4 as uuidv4 } from "uuid";
import { StreamSettingsRepository } from "../repositories/StreamSettingRepository";
import { GetStreamSettingsUsecase } from "../../application/usecases/streamSettings/GetStreamSettig";
import { UpdateStreamSettingsUsecase } from "../../application/usecases/streamSettings/updateStreamSetting";
import { CreateStreamSettingsUsecase } from "../../application/usecases/streamSettings/createStreamSettingUsecase";
import { createInviteUsecase } from "../../application/usecases/invite/createInviteUsecase";
import { StreamRepository } from "../repositories/command/streamCommandRepository";
import { UpdateStreamParticipantsUsecase } from "../../application/usecases/stream/UpdateStreamParticpantUsecase";

interface Producer {
  id: string;
  kind: string;
  userId: string;
  appData: any;
}

interface Participant {
  userId: string;
  role: "host" | "guest";
  username: string;
  sendTransport?: mediasoupTypes.WebRtcTransport;
  receiveTransport?: mediasoupTypes.WebRtcTransport;
  producers: mediasoupTypes.Producer[];
  consumers: mediasoupTypes.Consumer[];
  cameraOn?: boolean;
  micOn?: boolean;
}

export class SocketService {
  private streamSettingsRepository: StreamSettingsRepository;
  private streamRepository: StreamRepository;
  private getStreamSettingsUsecase: GetStreamSettingsUsecase;
  private updateStreamSettingsUsecase: UpdateStreamSettingsUsecase;
  private createStreamSettingsUsecase: CreateStreamSettingsUsecase;
  private inviteRepository: InviteRepository;

  private participants: {
    [streamId: string]: { [socketId: string]: Participant };
  } = {};
  private socketToStream: { [socketId: string]: string } = {};
  private routers: { [streamId: string]: mediasoupTypes.Router } = {};
  private streamProducers: { [streamId: string]: Producer[] } = {};
  private workers: mediasoupTypes.Worker[] = [];
  private workerIndex = 0;

  constructor(
    private io: SocketIOServer,
    private getLatestStreamUsecase: GetLatestStreamUsecase,
    private getSubscriptionStatusUsecase: GetSubscriptionStatus,
    private getChannelByIdUsecase: GetChannelById,
    private getUserByIdUsecase: GetUserById,
    private updateStreamParticipantUsecase: UpdateStreamParticipantsUsecase
  ) {
    this.streamSettingsRepository = new StreamSettingsRepository();
    this.streamRepository = new StreamRepository();
    this.getStreamSettingsUsecase = new GetStreamSettingsUsecase(
      this.streamSettingsRepository
    );
    this.updateStreamSettingsUsecase = new UpdateStreamSettingsUsecase(
      this.streamSettingsRepository
    );
    this.createStreamSettingsUsecase = new CreateStreamSettingsUsecase(
      this.streamSettingsRepository
    );
    this.inviteRepository = new InviteRepository();

    this.initializeWorker();
    this.initializeSocketEvents();
  }

  private async initializeWorker() {
    try {
      this.workers = await createWorkers();
      console.log(`Initialized ${this.workers.length} mediasoup workers`);
    } catch (error) {
      console.error("Failed to initialize mediasoup workers:", error);
    }
  }

  private getNextWorker(): mediasoupTypes.Worker {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    return worker;
  }

  private async createRouterIfNeeded(
    streamId: string
  ): Promise<mediasoupTypes.Router | null> {
    if (!this.routers[streamId] && this.workers.length > 0) {
      try {
        const worker = this.getNextWorker();
        this.routers[streamId] = await worker.createRouter({
          mediaCodecs: [
            {
              kind: "audio",
              mimeType: "audio/opus",
              clockRate: 48000,
              channels: 2,
            },
            { kind: "video", mimeType: "video/VP8", clockRate: 90000 },
          ],
        });
        console.log(`Created router for stream ${streamId}`);
        return this.routers[streamId];
      } catch (error) {
        console.error(`Error creating router for stream ${streamId}:`, error);
        return null;
      }
    }
    return this.routers[streamId] || null;
  }

  private async canAddParticipant(streamId: string): Promise<boolean> {
    if (!this.participants[streamId]) return true;

    const participants = Object.values(this.participants[streamId]);
    const guestCount = participants.filter((p) => p.role === "guest").length;
    return guestCount < 6; // Maximum 6 guests
  }

  private getParticipantsList(streamId: string) {
    if (!this.participants[streamId]) return [];

    return Object.values(this.participants[streamId]).map((p) => ({
      userId: p.userId,
      role: p.role,
      username: p.username,
    }));
  }

  private broadcastStreamUpdate(streamId: string) {
    const participantsList = this.getParticipantsList(streamId);
    this.io.to(streamId).emit("streamUpdate", {
      id: streamId,
      participants: participantsList,
    });
  }

  private sendExistingProducers(socket: Socket, streamId: string) {
    if (!this.streamProducers[streamId]) return;

    this.streamProducers[streamId].forEach((producer) => {
      socket.emit("newProducer", {
        producerId: producer.id,
        userId: producer.userId,
        kind: producer.kind,
        appData: producer.appData,
      });
    });
  }

  private async cleanupParticipant(socket: Socket) {
    const streamId = this.socketToStream[socket.id];
    if (
      !streamId ||
      !this.participants[streamId] ||
      !this.participants[streamId][socket.id]
    ) {
      return;
    }

    const participant = this.participants[streamId][socket.id];

    // Close transports
    if (participant.sendTransport) {
      participant.sendTransport.close();
    }

    if (participant.receiveTransport) {
      participant.receiveTransport.close();
    }

    // Close producers and remove from stream producers list
    participant.producers.forEach((producer) => {
      producer.close();

      if (this.streamProducers[streamId]) {
        const index = this.streamProducers[streamId].findIndex(
          (p) => p.id === producer.id
        );
        if (index !== -1) {
          this.streamProducers[streamId].splice(index, 1);
        }
      }
    });

    // Close consumers
    participant.consumers.forEach((consumer) => {
      consumer.close();
    });

    // Remove participant from tracking
    delete this.participants[streamId][socket.id];
    delete this.socketToStream[socket.id];

    // If no participants left in stream, clean up router
    if (Object.keys(this.participants[streamId]).length === 0) {
      if (this.routers[streamId]) {
        this.routers[streamId].close();
        delete this.routers[streamId];
      }
      delete this.participants[streamId];
      delete this.streamProducers[streamId];
    } else {
      // Notify others that participant left
      this.broadcastStreamUpdate(streamId);
      this.io
        .to(streamId)
        .emit("participantLeft", { userId: participant.userId });
    }
  }

  private initializeSocketEvents() {
    this.io.on("connection", (socket: Socket) => {
      console.log("A user connected:", socket.id);

      socket.on("generateInvite", async (data) => {
        try {
          const { channelId, userId } = data;
          const inviteService = new createInviteUsecase();
          const token = await inviteService.createInvite(channelId, userId);
          const inviteLink = `http://localhost:3001/dashboard/streamer/live?token=${token}`;
          socket.emit("inviteLink", { link: inviteLink, userId });
        } catch (error) {
          console.error("Error generating invite:", error);
          socket.emit("error", { message: "Failed to generate invite link" });
        }
      });

      socket.on(
        "joinStudio",
        async (data: { role: string; user: any; channelData: any }) => {
          try {
            const { role, user, channelData } = data;
            const stream: any = await this.getLatestStreamUsecase.execute(
              channelData._id
            );

            if (!stream?.id) {
              socket.emit("error", {
                message: "No active stream found for this channel",
              });
              return;
            }

            // Create router if needed
            const router = await this.createRouterIfNeeded(stream.id);
            if (!router) {
              socket.emit("error", {
                message: "Failed to initialize stream resources",
              });
              return;
            }

            // Join socket to room
            socket.join(stream.id);
            this.socketToStream[socket.id] = stream.id;

            if (!this.participants[stream.id]) {
              this.participants[stream.id] = {};
              this.streamProducers[stream.id] = [];
            }

            if (role === "host") {
              const hostParticipant: Participant = {
                userId: user._id,
                role: "host",
                username: user.username,
                producers: [],
                consumers: [],
              };

              this.participants[stream.id][socket.id] = hostParticipant;
              await this.updateStreamParticipantUsecase.execute(
                stream.id,
                hostParticipant
              );

              this.broadcastStreamUpdate(stream.id);
              socket.emit("participantJoined", hostParticipant);

              // Send existing producers to host
              this.sendExistingProducers(socket, stream.id);
            } else {
              // For viewers that aren't hosts or guests yet
              const participantsList = this.getParticipantsList(stream.id);
              socket.emit("streamUpdate", {
                id: stream.id,
                participants: participantsList,
              });

              // Send existing producers
              this.sendExistingProducers(socket, stream.id);
            }
          } catch (error) {
            console.error("Error in joinStudio:", error);
            socket.emit("error", { message: "Failed to join studio" });
          }
        }
      );

      socket.on("verifyInvite", async (data, callback) => {
        try {
          const { token, username } = data;

          const invite = await this.inviteRepository.findByToken(token);
          if (!invite || invite.expiresAt <= new Date()) {
            callback({ success: false, message: "Invite expired or invalid" });
            return;
          }

          if (data.userId && invite.userId !== data.userId) {
            callback({
              success: false,
              message: "You are not the invited user",
            });
            return;
          }

          const stream = await this.getLatestStreamUsecase.execute(
            invite.channelId
          );
          if (!stream?.id) {
            callback({ success: false, message: "No active stream found" });
            return;
          }

          if (invite.isApproved) {
            await this.createRouterIfNeeded(stream.id);

            const participant: Participant = {
              userId: invite.userId,
              role: "guest",
              username: username || "Guest",
              producers: [],
              consumers: [],
            };

            socket.join(stream.id);
            this.socketToStream[socket.id] = stream.id;

            if (!this.participants[stream.id]) {
              this.participants[stream.id] = {};
              this.streamProducers[stream.id] = [];
            }

            this.participants[stream.id][socket.id] = participant;
            await this.updateStreamParticipantUsecase.execute(
              stream.id,
              participant
            );

            this.broadcastStreamUpdate(stream.id);
            socket.emit("participantJoined", participant);

            // Send existing producers to guest
            this.sendExistingProducers(socket, stream.id);

            callback({
              success: true,
              roomId: invite.channelId,
              streamId: stream.id,
            });
          } else {
            callback({ success: true, roomId: invite.channelId });
          }
        } catch (error) {
          console.error("Error verifying invite:", error);
          callback({ success: false, message: "Internal server error" });
        }
      });

      socket.on("requestToJoin", async (data, callback) => {
        try {
          const { token, username, channelId, userId, cameraOn, micOn } = data;

          const invite = await this.inviteRepository.findByToken(token);
          if (
            !invite ||
            invite.expiresAt <= new Date() ||
            invite.channelId !== channelId
          ) {
            callback({ success: false, message: "Invalid or expired invite" });
            return;
          }

          if (invite.userId !== userId) {
            callback({
              success: false,
              message: "You are not the invited user",
            });
            return;
          }

          const stream = await this.getLatestStreamUsecase.execute(channelId);
          if (!stream?.id) {
            callback({ success: false, message: "No active stream found" });
            return;
          }

          const streamParticipants = this.participants[stream.id];
          if (
            !streamParticipants ||
            !Object.values(streamParticipants).some((p) => p.role === "host")
          ) {
            callback({
              success: false,
              message: "No host present in the stream",
            });
            return;
          }

          this.io.to(stream.id).emit("guestRequest", {
            token,
            username,
            channelId,
            socketId: socket.id,
            userId,
            cameraOn,
            micOn,
          });

          callback({ success: true, message: "Waiting for host approval" });
        } catch (error) {
          console.error("Error in requestToJoin:", error);
          callback({ success: false, message: "Internal server error" });
        }
      });

      socket.on("approveGuest", async (data) => {
        try {
          const { token, username, channelId, socketId, approverId } = data;

          const stream = await this.getLatestStreamUsecase.execute(channelId);
          if (!stream?.id) {
            socket.emit("error", { message: "No active stream found" });
            return;
          }

          if (!(await this.canAddParticipant(stream.id))) {
            this.io.to(socketId).emit("joinDenied", {
              message: "Maximum guest limit (6) reached",
            });
            return;
          }

          if (stream.createdBy.toString() !== approverId) {
            socket.emit("error", {
              message: "Only the host can approve guests",
            });
            return;
          }

          const invite = await this.inviteRepository.findByToken(token);
          if (
            !invite ||
            invite.expiresAt <= new Date() ||
            invite.channelId !== channelId
          ) {
            this.io
              .to(socketId)
              .emit("joinDenied", { message: "Invalid or expired invite" });
            return;
          }

          const router = await this.createRouterIfNeeded(stream.id);
          if (!router) {
            this.io.to(socketId).emit("joinDenied", {
              message: "Failed to initialize stream resources",
            });
            return;
          }

          const guestSocket = this.io.sockets.sockets.get(socketId);
          if (!guestSocket) {
            socket.emit("error", { message: "Guest socket not found" });
            return;
          }
          guestSocket.join(stream.id);

          if (!this.participants[stream.id]) {
            this.participants[stream.id] = {};
          }

          const participant: Participant = {
            userId: invite.userId,
            role: "guest",
            username,
            producers: [],
            consumers: [],
            cameraOn: data.cameraOn || false,
            micOn: data.micOn || false,
          };

          this.participants[stream.id][socketId] = participant;
          this.socketToStream[socketId] = stream.id;

          await this.updateStreamParticipantUsecase.execute(
            stream.id,
            participant
          );

          await this.inviteRepository.updateByToken(token, {
            isApproved: true,
          });

          this.broadcastStreamUpdate(stream.id);
          this.io.to(socketId).emit("joinApproved", { streamId: stream.id });

          // Send existing producers to new guest
          this.sendExistingProducers(
            this.io.sockets.sockets.get(socketId)!,
            stream.id
          );

          this.io.to(stream.id).emit("participantJoined", participant);
        } catch (error) {
          console.error("Error approving guest:", error);
          this.io
            .to(socket.id)
            .emit("joinDenied", { message: "Internal server error" });
        }
      });

      socket.on("denyGuest", ({ socketId, approverId, channelId }) => {
        this.getLatestStreamUsecase.execute(channelId).then((stream) => {
          if (stream && stream.createdBy.toString() === approverId) {
            this.io
              .to(socketId)
              .emit("joinDenied", { message: "Host denied your request" });
          }
        });
      });

      socket.on("getStreamSettings", async (streamId: string) => {
        try {
          if (!streamId) {
            socket.emit("error", { message: "Stream ID is required" });
            return;
          }
          const settings = await this.getStreamSettingsUsecase.execute(
            streamId
          );
          socket.emit("streamSettings", settings || {});
        } catch (error) {
          console.error("Error fetching stream settings:", error);
          socket.emit("error", { message: "Failed to fetch stream settings" });
        }
      });

      socket.on("updateStreamSettings", async ({ streamId, settings }) => {
        try {
          if (!streamId) {
            socket.emit("error", { message: "Stream ID is required" });
            return;
          }
          let updatedSettings = await this.getStreamSettingsUsecase.execute(
            streamId
          );
          if (updatedSettings) {
            updatedSettings = await this.updateStreamSettingsUsecase.execute(
              streamId,
              {
                ...settings,
                streamId,
              }
            );
          } else {
            updatedSettings = await this.createStreamSettingsUsecase.execute({
              ...settings,
              streamId,
            });
          }
          this.io.to(streamId).emit("streamSettings", updatedSettings);
        } catch (error) {
          console.error("Error updating stream settings:", error);
          socket.emit("error", { message: "Failed to update stream settings" });
        }
      });

      // Mediasoup Events
      socket.on("getRtpCapabilities", (data, callback) => {
        try {
          const { streamId } = data;
          const router = this.routers[streamId];
          if (router) {
            callback({ rtpCapabilities: router.rtpCapabilities });
          } else {
            callback({ error: "Router not found" });
          }
        } catch (error) {
          console.error("Error getting RTP capabilities:", error);
          callback({ error: "Failed to get RTP capabilities" });
        }
      });

      socket.on("createWebRtcTransport", async (data, callback) => {
        try {
          const { streamId, direction } = data; // 'send' or 'recv'

          if (!streamId) {
            callback({ error: "Stream ID is required" });
            return;
          }

          const router = this.routers[streamId];
          if (!router) {
            callback({ error: "Router not found" });
            return;
          }

          if (
            !this.participants[streamId] ||
            !this.participants[streamId][socket.id]
          ) {
            callback({ error: "Participant not found" });
            return;
          }

          const participant = this.participants[streamId][socket.id];

          const transport = await router.createWebRtcTransport({
            listenIps: [{ ip: "0.0.0.0" }],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
          });

          if (direction === "send") {
            participant.sendTransport = transport;
          } else {
            participant.receiveTransport = transport;
          }

          callback({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          });
        } catch (error) {
          console.error("Error creating WebRtcTransport:", error);
          callback({ error: "Failed to create transport" });
        }
      });

      socket.on("connectTransport", async (data, callback) => {
        try {
          const { streamId, transportId, dtlsParameters } = data;

          if (
            !streamId ||
            !this.participants[streamId] ||
            !this.participants[streamId][socket.id]
          ) {
            callback({ error: "Participant not found" });
            return;
          }

          const participant = this.participants[streamId][socket.id];
          const transport =
            participant.sendTransport?.id === transportId
              ? participant.sendTransport
              : participant.receiveTransport;

          if (!transport) {
            callback({ error: "Transport not found" });
            return;
          }

          await transport.connect({ dtlsParameters });
          callback({ success: true });
        } catch (error) {
          console.error("Error connecting transport:", error);
          callback({ error: "Failed to connect transport" });
        }
      });

      socket.on("produce", async (data, callback) => {
        try {
          const { streamId, kind, rtpParameters, appData } = data;

          if (
            !streamId ||
            !this.participants[streamId] ||
            !this.participants[streamId][socket.id]
          ) {
            callback({ error: "Participant not found" });
            return;
          }

          const participant = this.participants[streamId][socket.id];
          if (!participant.sendTransport) {
            callback({ error: "Send transport not found" });
            return;
          }

          const producer = await participant.sendTransport.produce({
            kind,
            rtpParameters,
            appData, // e.g., { source: "webcam" | "mic" | "screen" }
          });

          participant.producers.push(producer);

          // Add to stream producers list for new participants
          if (!this.streamProducers[streamId]) {
            this.streamProducers[streamId] = [];
          }

          this.streamProducers[streamId].push({
            id: producer.id,
            kind,
            userId: participant.userId,
            appData,
          });

          // Notify all participants about the new producer
          this.io.to(streamId).emit("newProducer", {
            producerId: producer.id,
            userId: participant.userId,
            kind,
            appData,
          });

          callback({ id: producer.id });

          // Listen for producer close events
          producer.on("transportclose", () => {
            console.log(`Producer ${producer.id} transport closed`);
            this.removeProducerFromStream(streamId, producer.id);
          });

          producer.on("@close", () => {
            console.log(`Producer ${producer.id} closed`);
            this.removeProducerFromStream(streamId, producer.id);
          });
        } catch (error) {
          console.error("Error producing:", error);
          callback({ error: "Failed to produce" });
        }
      });

      socket.on("pauseProducer", async (data, callback) => {
        try {
          const { streamId, producerId } = data;

          if (
            !streamId ||
            !this.participants[streamId] ||
            !this.participants[streamId][socket.id]
          ) {
            callback({ error: "Participant not found" });
            return;
          }

          const participant = this.participants[streamId][socket.id];
          const producer = participant.producers.find(
            (p) => p.id === producerId
          );

          if (!producer) {
            callback({ error: "Producer not found" });
            return;
          }

          await producer.pause();

          // Notify other participants with appData
          this.io.to(streamId).emit("producerPaused", {
            producerId,
            userId: participant.userId,
            appData: producer.appData,
          });

          callback({ success: true });
        } catch (error) {
          console.error("Error pausing producer:", error);
          callback({ error: "Failed to pause producer" });
        }
      });
      // Resume producer
      socket.on("resumeProducer", async (data, callback) => {
        try {
          const { streamId, producerId } = data;

          if (
            !streamId ||
            !this.participants[streamId] ||
            !this.participants[streamId][socket.id]
          ) {
            callback({ error: "Participant not found" });
            return;
          }

          const participant = this.participants[streamId][socket.id];
          const producer = participant.producers.find(
            (p) => p.id === producerId
          );

          if (!producer) {
            callback({ error: "Producer not found" });
            return;
          }

          await producer.resume();

          // Notify other participants with appData
          this.io.to(streamId).emit("producerResumed", {
            producerId,
            userId: participant.userId,
            appData: producer.appData,
          });

          callback({ success: true });
        } catch (error) {
          console.error("Error resuming producer:", error);
          callback({ error: "Failed to resume producer" });
        }
      });

      socket.on("consume", async (data, callback) => {
        try {
          const { streamId, producerId, rtpCapabilities } = data;

          if (!streamId) {
            callback({ error: "Stream ID is required" });
            return;
          }

          const router = this.routers[streamId];
          if (!router) {
            callback({ error: "Router not found" });
            return;
          }

          if (
            !this.participants[streamId] ||
            !this.participants[streamId][socket.id]
          ) {
            callback({ error: "Participant not found" });
            return;
          }

          const participant = this.participants[streamId][socket.id];
          if (!participant.receiveTransport) {
            callback({ error: "Receive transport not found" });
            return;
          }

          // Find the producer by ID
          let producerObject: mediasoupTypes.Producer | undefined;
          for (const p of Object.values(this.participants[streamId])) {
            producerObject = p.producers.find((prod) => prod.id === producerId);
            if (producerObject) break;
          }

          if (!producerObject) {
            callback({ error: "Producer not found" });
            return;
          }

          // Check if router can consume
          if (!router.canConsume({ producerId, rtpCapabilities })) {
            callback({
              error: "Router cannot consume with given RTP capabilities",
            });
            return;
          }

          const consumer = await participant.receiveTransport.consume({
            producerId,
            rtpCapabilities,
            paused: true, // Start paused, will resume after getting response
          });

          participant.consumers.push(consumer);

          // Handle consumer events
          consumer.on("transportclose", () => {
            console.log(`Consumer ${consumer.id} transport closed`);
          });

          consumer.on("producerclose", () => {
            console.log(`Consumer ${consumer.id} producer closed`);
            const index = participant.consumers.findIndex(
              (c) => c.id === consumer.id
            );
            if (index !== -1) {
              participant.consumers.splice(index, 1);
            }
            // Notify the client that producer was closed
            socket.emit("consumerClosed", {
              consumerId: consumer.id,
              reason: "producer closed",
            });
          });

          callback({
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          });
        } catch (error) {
          console.error("Error consuming:", error);
          callback({ error: "Failed to consume" });
        }
      });

      socket.on("resumeConsumer", async (data, callback) => {
        try {
          const { streamId, consumerId } = data;

          if (
            !streamId ||
            !this.participants[streamId] ||
            !this.participants[streamId][socket.id]
          ) {
            callback({ error: "Participant not found" });
            return;
          }

          const participant = this.participants[streamId][socket.id];
          const consumer = participant.consumers.find(
            (c) => c.id === consumerId
          );

          if (!consumer) {
            callback({ error: "Consumer not found" });
            return;
          }

          await consumer.resume();
          callback({ success: true });
        } catch (error) {
          console.error("Error resuming consumer:", error);
          callback({ error: "Failed to resume consumer" });
        }
      });

      socket.on("disconnect", async () => {
        try {
          await this.cleanupParticipant(socket);
          console.log("A user disconnected:", socket.id);
        } catch (error) {
          console.error("Error handling disconnect:", error);
        }
      });
    });
  }

  private removeProducerFromStream(streamId: string, producerId: string) {
    if (!this.streamProducers[streamId]) return;

    const index = this.streamProducers[streamId].findIndex(
      (p) => p.id === producerId
    );
    if (index !== -1) {
      this.streamProducers[streamId].splice(index, 1);
    }

    // Notify all participants that the producer is gone
    this.io.to(streamId).emit("producerClosed", { producerId });
  }
}
