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
import * as mediasoup from "mediasoup";
import {
  Worker,
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
} from "mediasoup/node/lib/types";

interface CustomSocket extends Socket {
  producerIds?: string[]; // Array of producer IDs
  streamId?: string; // Stream ID
  transports?: { send: string; recv: string };
  userId?: string; // User ID
}

export class SocketService {
  private streamSettingsRepository: StreamSettingsRepository;
  private streamRepository: StreamRepository;
  private getStreamSettingsUsecase: GetStreamSettingsUsecase;
  private updateStreamSettingsUsecase: UpdateStreamSettingsUsecase;
  private createStreamSettingsUsecase: CreateStreamSettingsUsecase;
  private InviteRepository: InviteRepository;

  private worker: Worker;
  private routers: Map<string, Router> = new Map();
  private transports: Map<string, WebRtcTransport> = new Map();
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();

  constructor(
    private io: SocketIOServer,
    private getLatestStreamUsecase: GetLatestStreamUsecase,
    private getSubscriptionStatusUsecase: GetSubscriptionStatus,
    private getChannelByIdUsecase: GetChannelById,
    private getUserByIdUsecase: GetUserById,
    private UpdateStreamParticipantUsecase: UpdateStreamParticipantsUsecase
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
    this.UpdateStreamParticipantUsecase = new UpdateStreamParticipantsUsecase(
      this.streamRepository
    );
    this.InviteRepository = new InviteRepository();

    this.initializeMediasoup().then(() => {
      this.initializeSocketEvents();
    });
  }

  private async initializeMediasoup() {
    this.worker = await mediasoup.createWorker({
      logLevel: "warn",
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
    });
    console.log("Mediasoup worker created");
  }

  // Add this method to check participant count
  private async canAddParticipant(streamId: string): Promise<boolean> {
    const stream = await this.getLatestStreamUsecase.execute(streamId);
    const participants = stream?.participants || [];
    const guestCount = participants.filter((p) => p.role === "guest").length;
    return guestCount < 6;
  }

  private initializeSocketEvents() {
    this.io.on("connection", (socket: CustomSocket) => {
      console.log("A user connected:", socket.id);

      socket.on("generateInvite", async (data) => {
        const { channelId, userId } = data;
        const inviteService = new createInviteUsecase();
        const token = await inviteService.createInvite(channelId, userId);
        const inviteLink = `http://localhost:3001/dashboard/streamer/live?token=${token}`;
        socket.emit("inviteLink", { link: inviteLink, userId });
      });

      socket.on(
        "joinStudio",
        async (data: { role: string; user: any; channelData: any }) => {
          const { role, user, channelData } = data;
          console.log(`${role} joined studio:`, user, "user got", channelData);
          const stream: any = await this.getLatestStreamUsecase.execute(
            channelData._id
          );
          console.log(stream, "got stream latest for streaming");

          if (stream?.id) {
            socket.join(stream.id);
            console.log("Socket joined room", stream.id);

            if (role === "host") {
              if (!this.routers.has(stream.id)) {
                const router = await this.worker.createRouter({
                  mediaCodecs: [
                    {
                      kind: "audio",
                      mimeType: "audio/opus",
                      clockRate: 48000,
                      channels: 2,
                    },
                    { kind: "video", mimeType: "video/VP8", clockRate: 90000 },
                    {
                      kind: "video",
                      mimeType: "video/H264",
                      clockRate: 90000,
                      parameters: {
                        "packetization-mode": 1,
                        "profile-level-id": "42e01f",
                        "level-asymmetry-allowed": 1,
                      },
                    },
                  ],
                });
                this.routers.set(stream.id, router);
                socket.streamId = stream.id;
                socket.userId = user._id;
                console.log(`Router created for stream ${stream.id}`);
              }
              const hostParticipant: any = {
                userId: user._id,
                role: "host",
                username: user.username,
              };
              const updatedStream =
                await this.UpdateStreamParticipantUsecase.execute(
                  stream.id,
                  hostParticipant
                );
              console.log(
                updatedStream,
                "updated stream got in the participant"
              );
              this.io.to(stream.id).emit("streamUpdate", updatedStream);
              this.io.to(stream.id).emit("participantJoined", hostParticipant);
            } else {
              socket.streamId = stream.id;
              socket.userId = user._id;
              console.log(
                "ggggggggggggggggguessssssssssssssssssssssssssssssssssssssssst i s sssssssssssssssssssssss joineeeeeeeeeeeeeeidng"
              );
              socket.emit("streamUpdate", stream);
            }

            // Send existing producers to the new participant
            const existingProducers = Array.from(this.producers.values())
              .filter(
                (p) =>
                  p.appData.streamId === stream.id &&
                  p.appData.userId !== socket.userId
              )
              .map((p) => ({
                producerId: p.id,
                producerUserId: p.appData.userId,
              }));
            socket.emit("existingProducers", existingProducers);
            console.log(
              "Sent existing producers to new participant:",
              existingProducers
            );
          } else {
            console.warn("No stream found for channel:", channelData._id);
            socket.emit("error", {
              message: "No active stream found for this channel",
            });
          }
        }
      );

      socket.on("getMediasoupConfig", async (callback) => {
        const streamId = socket.streamId;

        if (!streamId) return callback({ error: "Not joined to any stream" });
        const router = this.routers.get(streamId);
        if (!router)
          return callback({ error: "Router not found for this stream" });
        callback({ routerRtpCapabilities: router.rtpCapabilities });
      });

      socket.on(
        "createTransport",
        async (
          direction: "send" | "recv",
          callback: (transportOptions: any) => void
        ) => {
          const streamId = socket.streamId;
          if (!streamId) return callback({ error: "Not joined to any stream" });
          const router = this.routers.get(streamId);
          if (!router)
            return callback({ error: "Router not found for this stream" });

          try {
            const transport = await router.createWebRtcTransport({
              listenIps: [{ ip: "0.0.0.0", announcedIp: "127.0.0.1" }],
              enableUdp: true,
              enableTcp: true,
              preferUdp: true,
              initialAvailableOutgoingBitrate: 1000000,
            });

            this.transports.set(transport.id, transport);
            socket.transports = socket.transports || { send: "", recv: "" };
            socket.transports[direction] = transport.id;

            callback({
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
            });

            transport.on("routerclose", () => {
              transport.close();
              this.transports.delete(transport.id);
            });
          } catch (error) {
            console.error("Error creating transport:", error);
            callback({ error: "Failed to create transport" });
          }
        }
      );

      socket.on(
        "connectTransport",
        async ({ transportId, dtlsParameters }, callback) => {
          const transport = this.transports.get(transportId);
          if (!transport) return callback({ error: "Transport not found" });

          try {
            await transport.connect({ dtlsParameters });
            callback({});
          } catch (error) {
            console.error("Error connecting transport:", error);
            callback({ error: "Failed to connect transport" });
          }
        }
      );
      socket.on(
        "produce",
        async ({ transportId, kind, rtpParameters, appData }, callback) => {
          const transport = this.transports.get(transportId);
          console.log("transport inside the produce", transport);
          if (!transport) return callback({ error: "Transport not found" });

          try {
            const producer = await transport.produce({
              kind,
              rtpParameters,
              appData: {
                ...appData,
                userId: socket.userId,
                streamId: socket.streamId,
              },
            });
            this.producers.set(producer.id, producer);
            console.log("producer id", producer.id, "producer", producer);
            socket.producerIds = socket.producerIds || [];
            socket.producerIds.push(producer.id);
            console.log("socket producer ids", socket.producerIds);

            const streamId = socket.streamId;
            if (streamId && socket.userId) {
              this.io.to(streamId).emit("newProducer", {
                producerId: producer.id,
                producerUserId: socket.userId,
              });
            }
            console.log(
              "producer id in the callback",
              producer.id,
              socket.streamId
            );
            callback({ id: producer.id });

            producer.on("transportclose", () => {
              producer.close();
              this.producers.delete(producer.id);
            });
          } catch (error) {
            console.error("Error producing:", error);
            callback({ error: "Failed to produce" });
          }
        }
      );
      socket.on(
        "consume",
        async ({ transportId, producerId, rtpCapabilities }, callback) => {
          console.log(
            "Received consume event with callback type:",
            typeof callback
          );
          const transport = this.transports.get(transportId);
          if (!transport) {
            if (typeof callback === "function") {
              callback({ error: "Transport not found" });
            } else {
              console.warn("No callback provided, skipping response");
            }
            return;
          }
          const router = this.routers.get(socket.streamId!);
          if (!router) {
            if (typeof callback === "function") {
              callback({ error: "Router not found" });
            }
            return;
          }

          const producer = this.producers.get(producerId);
          if (!producer) {
            if (typeof callback === "function") {
              callback({ error: "Producer not found" });
            }
            return;
          }

          if (!router.canConsume({ producerId, rtpCapabilities })) {
            if (typeof callback === "function") {
              callback({ error: "Cannot consume this producer" });
            }
            return;
          }

          try {
            const consumer = await transport.consume({
              producerId,
              rtpCapabilities,
              paused: true,
              appData: producer.appData,
            });
            console.log(consumer, "consumer got in the consume");
            this.consumers.set(consumer.id, consumer);

            const response = {
              id: consumer.id,
              producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
              appData: consumer.appData,
            };

            console.log(response, "response in the consume");

            if (typeof callback === "function") {
              callback(response);
            } else {
              console.warn("No callback provided for consume response");
            }

            consumer.on("producerclose", () => {
              consumer.close();
              this.consumers.delete(consumer.id);
              socket.emit("producerClosed", { producerId });
            });
          } catch (error) {
            console.error("Error consuming:", error);
            if (typeof callback === "function") {
              callback({ error: "Failed to consume" });
            }
          }
        }
      );

      socket.on("resumeConsumer", async (consumerId, callback) => {
        const consumer = this.consumers.get(consumerId);
        if (consumer) {
          try {
            await consumer.resume();
            console.log(`Consumer ${consumerId} resumed successfully`);
            callback({ success: true });
          } catch (error: any) {
            console.error(`Error resuming consumer ${consumerId}:`, error);
            callback({ success: false, error: error.message });
          }
        } else {
          console.warn(`Consumer ${consumerId} not found`);
          callback({ success: false, error: "Consumer not found" });
        }
      });
      socket.on("closeProducer", async ({ producerId }) => {
        const producer = this.producers.get(producerId);
        if (producer) {
          producer.close();
          this.producers.delete(producerId);
          if (socket.streamId) {
            this.io.to(socket.streamId).emit("producerClosed", { producerId });
          }
        }
      });

      socket.on("verifyInvite", async (data, callback) => {
        const { token, username } = data;
        try {
          console.log(token, "token got in the verifyINvite");
          const invite = await this.InviteRepository.findByToken(token);
          if (!invite || invite.expiresAt <= new Date()) {
            callback({ success: false, message: "Invite expired or invalid" });
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
            socket.join(stream.id);
            const participant = { userId: invite.userId, role: "guest" };
            callback({
              success: true,
              roomId: invite.channelId,
              streamId: stream.id,
            });
            this.io.to(stream.id).emit("participantJoined", {
              userId: invite.userId,
              role: "guest",
              username: username || "Guest",
            });
          } else {
            callback({ success: true, roomId: invite.channelId });
          }
        } catch (error) {
          console.error("Error verifying invite:", error);
          callback({ success: false, message: "Internal server error" });
        }
      });

      socket.on(
        "requestToJoin",
        async (data: any, callback?: (response: any) => void) => {
          const { token, username, channelId, userId, cameraOn, micOn } = data;
          console.log(data, "in the request join have this data as data");
          try {
            const invite = await this.InviteRepository.findByToken(token);
            if (
              !invite ||
              invite.expiresAt <= new Date() ||
              invite.channelId !== channelId
            ) {
              const errorResponse = {
                success: false,
                message: "Invalid or expired invite",
              };
              if (callback) {
                callback(errorResponse);
              } else {
                socket.emit("error", errorResponse);
              }
              return;
            }

            if (invite.userId !== userId) {
              const errorResponse = {
                success: false,
                message: "You are not the invited user",
              };
              if (callback) {
                callback(errorResponse);
              } else {
                socket.emit("error", errorResponse);
              }
              return;
            }
            console.log("got invite in the request join");

            const stream = await this.getLatestStreamUsecase.execute(channelId);
            console.log("Stream in requestToJoin:", stream);
            if (!stream?.id) {
              const errorResponse = {
                success: false,
                message: "No active stream found",
              };
              if (callback) {
                callback(errorResponse);
              } else {
                socket.emit("error", errorResponse);
              }
              return;
            }

            console.log(`Emitting guestRequest to room ${stream.id}`);
            this.io.to(stream.id).emit("guestRequest", {
              token,
              username,
              channelId,
              socketId: socket.id,
              userId,
              cameraOn,
              micOn,
            });

            const successResponse = {
              success: true,
              message: "Waiting for host approval",
            };
            if (callback) {
              callback(successResponse);
            } else {
              socket.emit("joinRequestResponse", successResponse);
            }
          } catch (error) {
            console.error("Error in requestToJoin:", error);
            const errorResponse = {
              success: false,
              message: "Internal server error",
            };
            if (callback) {
              callback(errorResponse);
            } else {
              socket.emit("error", errorResponse);
            }
          }
        }
      );
      socket.on("approveGuest", async (data) => {
        const { token, username, channelId, socketId, approverId } = data;
        console.log(data, "data got in the approve guest");
        try {
          const stream = await this.getLatestStreamUsecase.execute(channelId);
          console.log(stream, "stream got in the approveg uest");
          if (!stream?.id) {
            socket.emit("error", { message: "No active stream found" });
            return;
          }

          if (!(await this.canAddParticipant(channelId))) {
            this.io.to(socketId).emit("joinDenied", {
              message: "Maximum guest limit (6) reached",
            });
            return;
          }
          console.log(
            stream.createdBy.toString(),
            approverId,
            "both id in the request josin"
          );
          if (stream.createdBy.toString() !== approverId) {
            socket.emit("error", {
              message: "Only the host can approve guests",
            });
            return;
          }

          const invite = await this.InviteRepository.findByToken(token);
          console.log(invite, "invite int eh gotrequst join");
          if (
            !invite ||
            invite.expiresAt <= new Date() ||
            invite.channelId !== channelId
          ) {
            console.log("invite worign");
            this.io
              .to(socketId)
              .emit("joinDenied", { message: "Invalid or expired invite" });
            return;
          }

          const participant: any = {
            userId: invite.userId,
            role: "guest",
            username: username,
          };
          const updatedStream =
            await this.UpdateStreamParticipantUsecase.execute(
              stream.id,
              participant
            );
          console.log(updatedStream, "updated strem response");
          await this.InviteRepository.updateByToken(token, {
            isApproved: true,
          });

          this.io.to(stream.id).emit("streamUpdate", updatedStream);
          this.io.to(socketId).emit("joinApproved", { streamId: stream.id });
          this.io.to(stream.id).emit("participantJoined", {
            userId: invite.userId,
            role: "guest",
            username,
          });
        } catch (error) {
          console.error("Error approving guest:", error);
          this.io
            .to(socketId)
            .emit("joinDenied", { message: "Internal server error" });
        }
      });

      socket.on("denyGuest", ({ socketId, approverId, channelId }) => {
        // Verify the denier is the host
        this.getLatestStreamUsecase.execute(channelId).then((stream) => {
          if (stream && stream.createdBy === approverId) {
            this.io
              .to(socketId)
              .emit("joinDenied", { message: "Host denied your request" });
          }
        });
      });
      socket.on("getStreamSettings", async (streamId: string) => {
        try {
          if (!streamId) {
            console.warn("No streamId provided in getStreamSettings");
            socket.emit("error", { message: "Stream ID is required" });
            return;
          }

          console.log(streamId, "stream id received in getStreamSettings");
          const settings = await this.getStreamSettingsUsecase.execute(
            streamId
          );
          console.log(settings, "settings");
          socket.emit("streamSettings", settings || {});
        } catch (error) {
          console.error("Error fetching stream settings:", error);
          socket.emit("error", { message: "Failed to fetch stream settings" });
        }
      });

      socket.on(
        "updateStreamSettings",
        async ({
          streamId,
          settings: newSettings,
        }: {
          streamId: string;
          settings: any;
        }) => {
          try {
            if (!streamId) {
              console.warn("No streamId provided in updateStreamSettings");
              socket.emit("error", { message: "Stream ID is required" });
              return;
            }

            console.log(streamId, "stream id in updateStreamSettings");
            let settings = await this.getStreamSettingsUsecase.execute(
              streamId
            );

            if (settings) {
              settings = await this.updateStreamSettingsUsecase.execute(
                streamId,
                {
                  ...newSettings,
                  streamId,
                }
              );
            } else {
              console.log("No settings found creating new one");
              settings = await this.createStreamSettingsUsecase.execute({
                ...newSettings,
                streamId,
              });
            }

            this.io.to(streamId).emit("streamSettings", settings);
          } catch (error) {
            console.error("Error updating stream settings:", error);
            socket.emit("error", {
              message: "Failed to update stream settings",
            });
          }
        }
      );

      socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
      });
    });
  }
}
