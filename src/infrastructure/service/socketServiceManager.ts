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

export class SocketService {
  private streamSettingsRepository: StreamSettingsRepository;
  private streamRepository: StreamRepository;
  private getStreamSettingsUsecase: GetStreamSettingsUsecase;
  private updateStreamSettingsUsecase: UpdateStreamSettingsUsecase;
  private createStreamSettingsUsecase: CreateStreamSettingsUsecase;
  private InviteRepository: InviteRepository;

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

    this.initializeSocketEvents();
  }

  // Add this method to check participant count
  private async canAddParticipant(streamId: string): Promise<boolean> {
    const stream = await this.getLatestStreamUsecase.execute(streamId);
    const participants = stream?.participants || [];
    const guestCount = participants.filter((p) => p.role === "guest").length;
    return guestCount < 6;
  }

  private initializeSocketEvents() {
    this.io.on("connection", (socket: Socket) => {
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
              const hostParticipant: any = {
                userId: user._id || socket.id,
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
              console.log(
                "ggggggggggggggggguessssssssssssssssssssssssssssssssssssssssst i s sssssssssssssssssssssss joineeeeeeeeeeeeeeidng"
              );
              socket.emit("streamUpdate", stream);
            }
          } else {
            console.warn("No stream found for channel:", channelData._id);
            socket.emit("error", {
              message: "No active stream found for this channel",
            });
          }
        }
      );

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
