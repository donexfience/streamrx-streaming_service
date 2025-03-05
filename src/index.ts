import cors from "cors";
import express, { Router, Request, Response, Application } from "express";
import morgan from "morgan";
import { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import {
  createServer as createHttpsServer,
  Server as HttpsServer,
} from "https";
import fs from "fs";
import { HttpCode } from "./_lib/statusCodes/constants-http-status";
import { AppDataSource } from "./config/dbConfig";
import { SocketService } from "./infrastructure/service/socketServiceManager";
import { GetLatestStreamUsecase } from "./application/usecases/stream/GetLatestStreamuseCase";
import { GetSubscriptionStatus } from "./application/usecases/subscriptions/getSubscripitonStatusUsecase";
import { GetChannelById } from "./application/usecases/channel/GetChannelById";
import { ChannelRepository } from "./infrastructure/repositories/channelRepository";
import { StreamQueryRepository } from "./infrastructure/repositories/query/streamQueryMongoRepository";
import { Database } from "./config/mongoConnection";
import { StreamSyncConsumer } from "./infrastructure/repositories/events/streamEvents";
import { ChannelSubscriptionRepository } from "./infrastructure/repositories/channelSubcriptionRepository";
import { GetUserById } from "./application/usecases/user/GetuserById";
import { UserRepository } from "./infrastructure/repositories/userRepostiory";
import { InviteRepository } from "./infrastructure/repositories/inviteRepository";
import { InviteModel } from "./infrastructure/models/invite";

interface ServerOptions {
  port: number;
  routes: Router;
  apiPrefix: string;
}

export class Server {
  private readonly app: Application;
  private readonly port: number;
  private readonly routes: Router;
  private readonly apiPrefix: string;
  private httpsServer: HttpsServer;
  private io: SocketIOServer;
  private socketService: SocketService;

  constructor(configOptions: ServerOptions) {
    const { port, apiPrefix, routes } = configOptions;
    this.app = express();
    this.port = port;
    this.routes = routes;
    this.apiPrefix = apiPrefix;

    const key = fs.readFileSync("./src/config/cert.key");
    const cert = fs.readFileSync("./src/config/cert.crt");
    const options = { key, cert };

    this.httpsServer = createHttpsServer(options, this.app);

    this.io = new SocketIOServer(this.httpsServer, {
      cors: {
        origin: ["http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
  }

  public async start(): Promise<void> {
    console.log(`API Prefix: ${this.apiPrefix}`);

    await AppDataSource.initialize();
    await this.initializeServices();
    const streamSyncConsumer = new StreamSyncConsumer();
    await streamSyncConsumer.start();
    const getLatestStreamUsecase = new GetLatestStreamUsecase(
      new StreamQueryRepository()
    );
    const getSubscriptionStatus = new GetSubscriptionStatus(
      new ChannelSubscriptionRepository()
    );
    const getChannelById = new GetChannelById(new ChannelRepository());
    const getUserById = new GetUserById(new UserRepository());
    const inviteRepository = new InviteRepository();

    this.socketService = new SocketService(
      this.io,
      getLatestStreamUsecase,
      getSubscriptionStatus,
      getChannelById,
      getUserById,
      inviteRepository
    );

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(
      cors({
        origin: ["http://localhost:3001"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true,
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "accesstoken",
          "refreshtoken",
        ],
        exposedHeaders: ["Authorization"],
      })
    );
    this.app.use(morgan("tiny"));
    this.app.use(this.apiPrefix, this.routes);

    this.app.get("/", (req: Request, res: Response) => {
      res.status(HttpCode.OK).send({
        message: `Welcome to Initial API! Endpoints available at https://localhost:${this.port}/`,
      });
    });

    this.io.on("connection", (socket: Socket) => {
      console.log(`New client connected: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    this.httpsServer.listen(this.port, () => {
      console.log(`HTTPS Server running on port ${this.port}...`);
    });
  }

  public getSocketIO(): SocketIOServer {
    return this.io;
  }

  private async initializeServices() {
    await Database.connect();
  }
}
