import { InviteRepository } from "./../repositories/inviteRepository";
import { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
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
  RtpCapabilities,
  DtlsParameters,
} from "mediasoup/node/lib/types";

interface TransportDirection {
  send: string;
  recv: string;
}

interface CustomSocket extends Socket {
  roomId?: string;
  transports?: TransportDirection;
  producerIds?: string[];
  userId?: string;
}

interface ParticipantData {
  userId: string;
  role: string;
  username: string;
  producerIds: string[];
  socketId: string;
}

export class SocketService {
  private streamSettingsRepository: StreamSettingsRepository;
  private streamRepository: StreamRepository;
  private getStreamSettingsUsecase: GetStreamSettingsUsecase;
  private updateStreamSettingsUsecase: UpdateStreamSettingsUsecase;
  private createStreamSettingsUsecase: CreateStreamSettingsUsecase;
  private InviteRepository: InviteRepository;
  private worker!: Worker;
  private router!: Router;
  private transports: Map<string, WebRtcTransport> = new Map(); // transportId -> transport
  private producers: Map<string, Producer> = new Map(); // producerId -> producer
  private consumers: Map<string, Consumer> = new Map(); // consumerId -> consumer
  // Keep track of user IDs to current socket IDs
  private userSocketMap: Map<string, string> = new Map(); // userId -> socketId
  // Store participants by userId rather than socketId to avoid duplicates
  private rooms: Map<string, { participants: Map<string, ParticipantData> }> =
    new Map(); // streamId -> { participants: userId -> participantData }

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

    this.initializeMediasoup();
    this.initializeSocketEvents();
  }

  private async initializeMediasoup() {
    try {
      this.worker = await mediasoup.createWorker({
        logLevel: "warn",
        rtcMinPort: 10000,
        rtcMaxPort: 10100,
      });
      console.log("Mediasoup worker created");

      this.router = await this.worker.createRouter({
        mediaCodecs: [
          {
            kind: "audio",
            mimeType: "audio/opus",
            clockRate: 48000,
            channels: 2,
          },
          {
            kind: "video",
            mimeType: "video/VP8",
            clockRate: 90000,
          },
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
      console.log("Mediasoup router created");
    } catch (error) {
      console.error("Failed to initialize Mediasoup:", error);
      process.exit(1);
    }
  }

  // Helper method to check participant count
  private async canAddGuestParticipant(streamId: string): Promise<boolean> {
    const stream = await this.getLatestStreamUsecase.execute(streamId);
    if (!stream) return false;

    const participants = stream.participants || [];
    const guestCount = participants.filter((p) => p.role === "guest").length;
    return guestCount < 3; // Maximum 3 guests allowed
  }

  // Helper to check if user is host of the stream
  private async isUserStreamHost(
    streamId: string,
    userId: string
  ): Promise<any> {
    const stream = await this.getLatestStreamUsecase.execute(streamId);
    return stream && stream.createdBy.toString() === userId.toString();
  }

  // Helper to check if host is in the room
  private hasHostInRoom(streamId: string): boolean {
    const room = this.rooms.get(streamId);
    if (!room) return false;

    return Array.from(room.participants.values()).some(
      (p) => p.role === "host"
    );
  }

  // Helper to check if user is already in room by userId (not socketId)
  private isUserAlreadyInRoom(streamId: string, userId: string): boolean {
    const room = this.rooms.get(streamId);
    console.log(room, "room in the isUserAlreadyInRoom functionnnnnnn");
    if (!room) return false;

    return room.participants.has(userId);
  }

  private async verifyInviteToken(
    token: string,
    userId: string
  ): Promise<{
    success: boolean;
    invite?: any;
    stream?: any;
    message?: string;
  }> {
    try {
      const invite = await this.InviteRepository.findByToken(token);
      if (!invite || invite.expiresAt <= new Date()) {
        return { success: false, message: "Invite expired or invalid" };
      }

      if (invite.userId !== userId) {
        return { success: false, message: "You are not the invited user" };
      }

      const stream = await this.getLatestStreamUsecase.execute(
        invite.channelId
      );
      if (!stream?.id) {
        return { success: false, message: "No active stream found" };
      }

      return { success: true, invite, stream };
    } catch (error) {
      console.error("Error verifying invite token:", error);
      return { success: false, message: "Internal server error" };
    }
  }

  //method  for handling guest join requests
  async handleGuestJoinRequest(
    socket: CustomSocket,
    token: string,
    username: string,
    userId: string,
    channelId: string,
    cameraOn: boolean,
    micOn: boolean,
    callback?: (response: any) => void
  ): Promise<void> {
    const result = await this.verifyInviteToken(token, userId);

    if (!result.success) {
      const errorResponse = { success: false, message: result.message };
      if (callback) callback(errorResponse);
      else socket.emit("error", errorResponse);
      return;
    }

    const { invite, stream } = result;

    // Store user ID on socket for tracking
    socket.userId = userId;

    // Check if host is in room
    if (!this.hasHostInRoom(stream.id)) {
      const errorResponse = {
        success: false,
        message: "Host is not present. Please wait for the host to join.",
      };
      if (callback) callback(errorResponse);
      else socket.emit("joinDenied", errorResponse);
      return;
    }

    // If already approved and reconnecting
    if (invite.isApproved && this.isUserAlreadyInRoom(stream.id, userId)) {
      // Handle reconnection
      socket.join(stream.id);
      socket.roomId = stream.id;

      const room = this.rooms.get(stream.id)!;
      const participant = room.participants.get(userId);
      if (participant) {
        participant.socketId = socket.id;
        this.userSocketMap.set(userId, socket.id);
      }

      const successResponse = {
        success: true,
        message: "Already approved, reconnecting",
        streamId: stream.id,
        reconnected: true,
      };

      if (callback) callback(successResponse);
      else
        socket.emit("joinApproved", { streamId: stream.id, reconnected: true });

      // Send current state
      socket.emit("routerRtpCapabilities", this.router.rtpCapabilities);
      this.sendCurrentParticipants(socket as CustomSocket, stream.id);
      this.sendExistingProducers(socket as CustomSocket, stream.id);
      return;
    }

    // For new join requests
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
    if (callback) callback(successResponse);
    else socket.emit("joinRequestResponse", successResponse);
  }

  // Helper to manage room participants
  private addParticipantToRoom(
    streamId: string,
    userId: string,
    socketId: string,
    role: string,
    username: string
  ): { participantData: ParticipantData; isNew: boolean } {
    if (!this.rooms.has(streamId)) {
      this.rooms.set(streamId, { participants: new Map() });
    }

    const room = this.rooms.get(streamId)!;
    let isNew = false;

    // Check if user already exists in the room
    const existingParticipant = room.participants.get(userId);
    if (existingParticipant) {
      // User already exists, update the socket ID
      console.log(
        `Updating existing participant ${userId} with new socket ${socketId}`
      );
      existingParticipant.socketId = socketId;
      existingParticipant.username = username;
      this.userSocketMap.set(userId, socketId);
      return { participantData: existingParticipant, isNew: false };
    }

    // Create new participant
    const participantData: ParticipantData = {
      userId,
      role,
      username,
      producerIds: [],
      socketId,
    };

    console.log(
      `Adding new participant ${userId} with socket ${socketId} to room ${streamId}`
    );
    room.participants.set(userId, participantData);
    this.userSocketMap.set(userId, socketId);

    return { participantData, isNew: true };
  }
  // Helper to send list of current participants to a socket
  private sendCurrentParticipants(
    socket: CustomSocket,
    streamId: string
  ): void {
    const room = this.rooms.get(streamId);
    console.log(room, "room in the sendCurrentParticipants functionnnnnnn");
    if (!room) return;

    room.participants.forEach((participantData) => {
      console.log(
        `Sending current using helper participant data to ${socket.id}: ${participantData.username} role: ${participantData.role}`
      );
      socket.emit("participantJoined", {
        socketId: participantData.socketId,
        userId: participantData.userId,
        role: participantData.role,
        username: participantData.username,
      });
    });
  }

  // Helper to send existing producers to a socket
  private sendExistingProducers(socket: CustomSocket, streamId: string): void {
    const room = this.rooms.get(streamId);
    console.log(room, "room in the sendExistingProducers functionnnnnnn");
    if (!room) return;

    room.participants.forEach((participantData) => {
      if (
        participantData.socketId !== socket.id &&
        participantData.producerIds.length > 0
      ) {
        participantData.producerIds.forEach((producerId) => {
          console.log(
            `Sending existing producer ${producerId} to ${socket.id}, role: ${participantData.role} username: ${participantData.username}`
          );
          socket.emit("newProducer", {
            producerId,
            producerSocketId: participantData.socketId,
            userId: participantData.userId,
            role: participantData.role,
            username: participantData.username,
          });
        });
      }
    });
  }

  // Clean up user resources
  private cleanupUserResources(socket: CustomSocket): void {
    if (!socket.userId) {
      console.log("Socket disconnected without userId, skipping cleanup");
      return;
    }

    console.log(`Cleaning up resources for user ${socket.userId}`);

    // Close transports
    if (socket.transports) {
      if (socket.transports.send) {
        const sendTransport = this.transports.get(socket.transports.send);
        if (sendTransport) {
          sendTransport.close();
          this.transports.delete(socket.transports.send);
        }
      }
      if (socket.transports.recv) {
        const recvTransport = this.transports.get(socket.transports.recv);
        if (recvTransport) {
          recvTransport.close();
          this.transports.delete(socket.transports.recv);
        }
      }
    }

    // Close producers
    if (socket.producerIds) {
      socket.producerIds.forEach((producerId) => {
        const producer = this.producers.get(producerId);
        if (producer) {
          producer.close();
          this.producers.delete(producerId);
          if (socket.roomId) {
            this.io.to(socket.roomId).emit("producerClosed", { producerId });
          }
        }
      });
    }

    // Remove from room if it's the user's last socket
    if (socket.roomId && socket.userId) {
      const room = this.rooms.get(socket.roomId);
      if (room) {
        const participant = room.participants.get(socket.userId);

        // Only remove the participant if this was their last socket connection
        if (participant && participant.socketId === socket.id) {
          room.participants.delete(socket.userId);
          this.userSocketMap.delete(socket.userId);

          // Notify others about participant leaving
          this.io.to(socket.roomId).emit("participantLeft", {
            userId: socket.userId,
            socketId: socket.id,
          });

          // Clean up empty rooms
          if (room.participants.size === 0) {
            this.rooms.delete(socket.roomId);
            console.log(`Room ${socket.roomId} removed as it's empty`);
          }
        }
      }
    }
  }

  private initializeSocketEvents() {
    this.io.on("connection", (socket: Socket) => {
      const customSocket = socket as CustomSocket;
      console.log("A user connected:", socket.id);

      socket.onAny((event, ...args) => {
        console.log(
          `Event got here check here for more detials: ${event}, Args: ${JSON.stringify(
            args
          )}`
        );
      });

      // Monkey-patch emit to debug sent events
      const originalEmit = socket.emit;
      socket.emit = function (event, ...args) {
        console.log(` Event sent here for more details: "${event}"`, ...args);
        return originalEmit.call(this, event, ...args);
      };

      /** Generate invite link */
      socket.on("generateInvite", async (data) => {
        const { channelId, userId } = data;
        const inviteService = new createInviteUsecase();
        const token = await inviteService.createInvite(channelId, userId);
        const inviteLink = `http://localhost:3001/dashboard/streamer/live?token=${token}`;
        socket.emit("inviteLink", { link: inviteLink, userId });
      });

      /** Handle studio joining for hosts and other roles */
      socket.on(
        "joinStudio",
        async (data: { role: string; user: any; channelData: any }) => {
          const { role, user, channelData } = data;
          console.log(`${role} joined studio:`, user.username || "Unknown");

          const stream: any = await this.getLatestStreamUsecase.execute(
            channelData._id
          );

          if (!stream?.id) {
            console.warn("No stream found for channel:", channelData._id);
            socket.emit("error", {
              message: "No active stream found for this channel",
            });
            return;
          }

          // Join socket room
          socket.join(stream.id);
          customSocket.roomId = stream.id;
          customSocket.userId = user._id;

          // Add to participants with proper user tracking
          const { participantData, isNew } = this.addParticipantToRoom(
            stream.id,
            user._id,
            socket.id,
            role,
            user.username || "Unknown"
          );

          // Send RTP capabilities for WebRTC setup
          socket.emit("routerRtpCapabilities", this.router.rtpCapabilities);

          if (role === "host") {
            // Update stream participants in database
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

            this.io.to(stream.id).emit("streamUpdate", updatedStream);

            // Notify all participants about the host joining
            this.io.to(stream.id).emit("participantJoined", {
              socketId: socket.id,
              userId: user._id,
              role: role,
              username: user.username,
            });
          } else {
            socket.emit("streamUpdate", stream);
            if (isNew) {
              this.io.to(stream.id).emit("participantJoined", {
                socketId: socket.id,
                userId: user._id,
                role: role,
                username: user.username,
              });
            }
          }

          // Send existing participants and producers
          this.sendCurrentParticipants(customSocket, stream.id);
          this.sendExistingProducers(customSocket, stream.id);
        }
      );

      /** Verify invite token */
      socket.on("verifyInvite", async (data, callback) => {
        const { token, username } = data;
        try {
          const invite = await this.InviteRepository.findByToken(token);
          let user;
          if (invite?.userId) {
            user = await this.getUserByIdUsecase.execute(invite.userId);
          }
          console.log(user, "user in the verify invite functionnnnnnnn");
          if (!user) {
            callback({ success: false, message: "User not found" });
            return;
          }

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

          // If already approved, allow direct join
          if (invite.isApproved) {
            // Check if host is present
            if (!this.hasHostInRoom(stream.id)) {
              callback({
                success: false,
                message:
                  "Host is not present. Please wait for the host to join.",
              });
              return;
            }

            // Check if user is already in room
            if (this.isUserAlreadyInRoom(stream.id, invite.userId)) {
              // User reconnecting - update their socket ID
              socket.join(stream.id);
              customSocket.roomId = stream.id;
              customSocket.userId = invite.userId;

              // Update socket ID for existing participant
              const room = this.rooms.get(stream.id)!;
              const participant = room.participants.get(invite.userId);
              if (participant) {
                participant.socketId = socket.id;
                this.userSocketMap.set(invite.userId, socket.id);
              }

              socket.emit("routerRtpCapabilities", this.router.rtpCapabilities);
              callback({
                success: true,
                roomId: invite.channelId,
                streamId: stream.id,
                reconnected: true,
              });

              // Send existing participants and producers
              this.sendCurrentParticipants(customSocket, stream.id);
              this.sendExistingProducers(customSocket, stream.id);
            } else {
              // New join
              socket.join(stream.id);
              customSocket.roomId = stream.id;
              customSocket.userId = invite.userId;
              const backendusername = user?.username;
              let newUsername;
              if (username == "") {
                newUsername = backendusername;
              }

              // Add user to room
              this.addParticipantToRoom(
                stream.id,
                invite.userId,
                socket.id,
                "guest",
                username || backendusername
              );

              socket.emit("routerRtpCapabilities", this.router.rtpCapabilities);
              callback({
                success: true,
                roomId: invite.channelId,
                streamId: stream.id,
              });

              // Notify others about new participant
              this.io.to(stream.id).emit("participantJoined", {
                socketId: socket.id,
                userId: invite.userId,
                role: "guest",
                username: username || "Guest",
              });

              // Send existing participants and producers
              this.sendCurrentParticipants(customSocket, stream.id);
              this.sendExistingProducers(customSocket, stream.id);
            }
          } else {
            // Not yet approved, just verify the invite is valid
            callback({ success: true, roomId: invite.channelId });
          }
        } catch (error) {
          console.error("Error verifying invite:", error);
          callback({ success: false, message: "Internal server error" });
        }
      });

      /** Handle join requests from guests */
      socket.on(
        "requestToJoin",
        async (data: any, callback?: (response: any) => void) => {
          const { token, username, channelId, userId, cameraOn, micOn } = data;
          await this.handleGuestJoinRequest(
            customSocket,
            token,
            username,
            userId,
            channelId,
            cameraOn,
            micOn,
            callback
          );
        }
      );

      /** Approve a guest's join request */
      socket.on("approveGuest", async (data) => {
        const { token, username, channelId, socketId, approverId } = data;
        try {
          const stream = await this.getLatestStreamUsecase.execute(channelId);
          if (!stream?.id) {
            socket.emit("error", { message: "No active stream found" });
            return;
          }

          // Verify approver is the host
          if (stream.createdBy.toString() !== approverId) {
            socket.emit("error", {
              message: "Only the host can approve guests",
            });
            return;
          }

          // Check if host is in the room
          if (!this.hasHostInRoom(stream.id)) {
            this.io.to(socketId).emit("joinDenied", {
              message: "Host is not present. Please wait for the host to join.",
            });
            return;
          }

          // Check guest limit
          if (!(await this.canAddGuestParticipant(channelId))) {
            this.io.to(socketId).emit("joinDenied", {
              message: "Maximum guest limit (3) reached",
            });
            return;
          }

          // Verify invite
          const invite = await this.InviteRepository.findByToken(token);
          if (
            !invite ||
            invite.expiresAt <= new Date() ||
            invite.channelId !== channelId
          ) {
            this.io.to(socketId).emit("joinDenied", {
              message: "Invalid or expired invite",
            });
            return;
          }

          // Get the target socket
          const guestSocket = this.io.sockets.sockets.get(
            socketId
          ) as CustomSocket;

          console.log(
            `Guest socket found: ${guestSocket?.id}, socket :${guestSocket}`
          );
          if (!guestSocket) {
            socket.emit("error", { message: "Guest is no longer connected" });
            return;
          }

          // Mark invite as approved in database
          await this.InviteRepository.updateByToken(token, {
            isApproved: true,
          });

          // Add user to stream participants in database
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

          // Add user to socket room
          guestSocket.join(stream.id);
          guestSocket.roomId = stream.id;
          guestSocket.userId = invite.userId;

          // Add to participants map
          this.addParticipantToRoom(
            stream.id,
            invite.userId,
            socketId,
            "guest",
            username
          );

          // Update all clients
          this.io.to(stream.id).emit("streamUpdate", updatedStream);

          // Notify the guest they're approved
          this.io.to(socketId).emit("joinApproved", { streamId: stream.id });

          // Notify everyone about the new participant
          this.io.to(stream.id).emit("participantJoined", {
            socketId: socketId,
            userId: invite.userId,
            role: "guest",
            username,
          });

          // Send current participants and producers to the new guest
          guestSocket.emit(
            "routerRtpCapabilities",
            this.router.rtpCapabilities
          );
          this.sendCurrentParticipants(guestSocket, stream.id);
          this.sendExistingProducers(guestSocket, stream.id);
        } catch (error) {
          console.error("Error approving guest:", error);
          this.io.to(socketId).emit("joinDenied", {
            message: "Internal server error",
          });
        }
      });

      /** Deny a guest's join request */
      socket.on("denyGuest", async ({ socketId, approverId, channelId }) => {
        try {
          // Verify the denier is the host
          const isHost = await this.isUserStreamHost(channelId, approverId);
          if (isHost) {
            this.io.to(socketId).emit("joinDenied", {
              message: "Host denied your request",
            });
          } else {
            socket.emit("error", {
              message: "Only the host can deny guest requests",
            });
          }
        } catch (error) {
          console.error("Error denying guest:", error);
          socket.emit("error", { message: "Failed to process denial" });
        }
      });

      /** Get stream settings */
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

      /** Update stream settings */
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
              socket.emit("error", { message: "Stream ID is required" });
              return;
            }

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

      /** Create WebRTC transport */
      socket.on(
        "createTransport",
        async (
          data: { direction: "send" | "recv" },
          callback: (response: any) => void
        ) => {
          try {
            const transport = await this.router.createWebRtcTransport({
              listenIps: [{ ip: "0.0.0.0", announcedIp: "127.0.0.1" }],
              enableUdp: true,
              enableTcp: true,
              preferUdp: true,
              initialAvailableOutgoingBitrate: 1000000,
            });

            this.transports.set(transport.id, transport);

            if (!customSocket.transports) {
              customSocket.transports = { send: "", recv: "" };
            }
            customSocket.transports[data.direction] = transport.id;

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
        async (
          data: { transportId: string; dtlsParameters: DtlsParameters },
          callback: (response?: any) => void
        ) => {
          const transport = this.transports.get(data.transportId);
          if (!transport) {
            callback({ error: "Transport not found" });
            return;
          }
          try {
            await transport.connect({ dtlsParameters: data.dtlsParameters });
            console.log(`Transport ${data.transportId} connected`);
            callback();
          } catch (error) {
            console.error("Error connecting transport:", error);
            callback({ error: "Failed to connect transport" });
          }
        }
      );

      /** Produce media */
      socket.on(
        "produce",
        async (
          data: {
            transportId: string;
            kind: "audio" | "video";
            rtpParameters: any;
          },
          callback: (response: any) => void
        ) => {
          const transport = this.transports.get(data.transportId);
          if (!transport) {
            callback({ error: "Transport not found" });
            return;
          }
          try {
            const producer = await transport.produce({
              kind: data.kind,
              rtpParameters: data.rtpParameters,
            });
            this.producers.set(producer.id, producer);
            if (!customSocket.producerIds) customSocket.producerIds = [];
            customSocket.producerIds.push(producer.id);
            console.log(`Producer created: ${producer.id}, kind: ${data.kind}`);

            if (customSocket.roomId && customSocket.userId) {
              const room = this.rooms.get(customSocket.roomId);
              if (room) {
                const participantData = room.participants.get(
                  customSocket.userId
                );
                if (participantData) {
                  // Add producer to participant's producer list
                  participantData.producerIds.push(producer.id);

                  // Notify all other participants about this new producer
                  this.io.to(customSocket.roomId).emit("newProducer", {
                    producerId: producer.id,
                    producerSocketId: socket.id,
                    userId: participantData.userId,
                    role: participantData.role,
                    username: participantData.username,
                  });
                } else {
                  console.warn(
                    `Participant not found for user ${customSocket.userId}`
                  );
                }
              }
            }
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

      /** Consume media */
      socket.on(
        "consume",
        async (
          data: {
            transportId: string;
            producerId: string;
            rtpCapabilities: RtpCapabilities;
          },
          callback: (response: any) => void
        ) => {
          const transport = this.transports.get(data.transportId);
          if (!transport) {
            callback({ error: "Transport not found" });
            return;
          }
          if (
            !this.router.canConsume({
              producerId: data.producerId,
              rtpCapabilities: data.rtpCapabilities,
            })
          ) {
            callback({ error: "Cannot consume this producer" });
            return;
          }
          try {
            const consumer = await transport.consume({
              producerId: data.producerId,
              rtpCapabilities: data.rtpCapabilities,
              paused: true,
            });
            this.consumers.set(consumer.id, consumer);
            console.log(
              `Consumer created: ${consumer.id} for producer: ${data.producerId}`
            );
            callback({
              id: consumer.id,
              producerId: data.producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
            });

            consumer.on("producerclose", () => {
              consumer.close();
              this.consumers.delete(consumer.id);
              socket.emit("producerClosed", { producerId: data.producerId });
            });
          } catch (error) {
            console.error("Error consuming:", error);
            callback({ error: "Failed to consume" });
          }
        }
      );

      /** Resume consumer */
      socket.on(
        "resumeConsumer",
        async (consumerId: string, callback: (response?: any) => void) => {
          const consumer = this.consumers.get(consumerId);
          if (consumer) {
            await consumer.resume();
            callback();
          } else {
            callback({ error: "Consumer not found" });
          }
        }
      );

      /** Close producer */
      socket.on("closeProducer", async (data: { producerId: string }) => {
        const producer = this.producers.get(data.producerId);
        if (producer) {
          producer.close();
          this.producers.delete(data.producerId);

          // Notify room about closed producer
          if (customSocket.roomId) {
            this.io.to(customSocket.roomId).emit("producerClosed", {
              producerId: data.producerId,
            });

            // Remove producer ID from participant's list
            if (customSocket.userId) {
              const room = this.rooms.get(customSocket.roomId);
              if (room) {
                const participant = room.participants.get(customSocket.userId);
                if (participant) {
                  const index = participant.producerIds.indexOf(
                    data.producerId
                  );
                  if (index !== -1) {
                    participant.producerIds.splice(index, 1);
                  }
                }
              }
            }
          }
          console.log(`Producer ${data.producerId} closed`);
        }
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        this.cleanupUserResources(customSocket);
      });
    });
  }
}
