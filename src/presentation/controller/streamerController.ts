import { Request, Response } from "express";
import { CreateStreamUsecase } from "../../application/usecases/stream/CreateStreamUsecase";
import { GetStreamByChannelIdUsecase } from "../../application/usecases/stream/GetStreamByChannelId";
import { GetStreamByIdUsecase } from "../../application/usecases/stream/GetStreamById";
import { EditStreamUsecase } from "../../application/usecases/stream/EditStreamUseCase";
import { StreamQueryRepository } from "../../infrastructure/repositories/query/streamQueryMongoRepository";
import { StreamRepository } from "../../infrastructure/repositories/command/streamCommandRepository";

export class StreamController {
  private readonly createStreamUseCase: CreateStreamUsecase;
  private readonly getStreamByChannelIdUsecase: GetStreamByChannelIdUsecase;
  private readonly getStreamByIdUsecase: GetStreamByIdUsecase;
  private readonly EditStreamUsecase: EditStreamUsecase;

  constructor() {
    const streamCommandRepository = new StreamRepository();
    const streamQueryRepository = new StreamQueryRepository();
    this.createStreamUseCase = new CreateStreamUsecase(streamCommandRepository);
    this.getStreamByChannelIdUsecase = new GetStreamByChannelIdUsecase(
      streamQueryRepository
    );
    this.getStreamByIdUsecase = new GetStreamByIdUsecase(streamQueryRepository);
    this.EditStreamUsecase = new EditStreamUsecase(streamCommandRepository);
  }

  async createStream(req: Request, res: Response) {
    try {
      const streamData = req.body;
      const stream = await this.createStreamUseCase.execute(streamData);
      res.status(201).json({
        success: true,
        data: stream,
        message: "Stream created successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create stream",
      });
    }
  }

  async getStream(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const stream = await this.getStreamByIdUsecase.execute(id);
      res.status(200).json({
        success: true,
        data: stream,
        message: "Stream retrieved successfully",
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Failed to retrieve stream",
      });
    }
  }

  async getChannelStreams(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const streams = await this.getStreamByChannelIdUsecase.execute(channelId);
      res.status(200).json({
        success: true,
        data: streams,
        message: "Channel streams retrieved successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to retrieve channel streams",
      });
    }
  }

  async EditStream(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const { updateData } = req.body;
      const streams = await this.EditStreamUsecase.execute(
        channelId,
        updateData
      );
      res.status(200).json({
        success: true,
        data: streams,
        message: "Channel streams retrieved successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to retrieve channel streams",
      });
    }
  }
}
