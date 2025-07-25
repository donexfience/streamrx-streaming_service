import cors from "cors";
import express, { Router, Request, Response, Application } from "express";
import morgan from "morgan";
import { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createHttpServer, Server as HttpServer } from "http";
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
import { StreamServiceConsumer } from "./infrastructure/rabbitmq/consumer";
import { CreateUser } from "./application/usecases/user/createUser";
import { UpdateUser } from "./application/usecases/user/updateUser";
import { SubscribeToChannel } from "./application/usecases/subscriptions/subscribeChannelUsecase";
import { UnsubscribeFromChannel } from "./application/usecases/subscriptions/unSubscribeChannelUsecase";
import { CreateChannel } from "./application/usecases/channel/CreateChannelUsecase";
import { EditChannel } from "./application/usecases/channel/EditChannelUsecase";
import { UpdateUserRole } from "./application/usecases/user/update-user-role";
import {
  UpdateStreamParticipantsUsecase,
} from "./application/usecases/stream/UpdateStreamParticpantUsecase";
import { StreamRepository } from "./infrastructure/repositories/command/streamCommandRepository";

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
  private httpServer: HttpServer;
  private io: SocketIOServer;
  private socketService: SocketService;

  constructor(configOptions: ServerOptions) {
    const { port, apiPrefix, routes } = configOptions;
    this.app = express();
    this.port = port;
    this.routes = routes;
    this.apiPrefix = apiPrefix;

    // Create HTTP server
    this.httpServer = createHttpServer(this.app);

    // Initialize Socket.IO with the HTTP server
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: ["http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
  }

  // const key = fs.readFileSync("./src/config/cert.key");
  // const cert = fs.readFileSync("./src/config/cert.crt");
  // const options = { key, cert };

  // this.httpsServer = createHttpsServer(options, this.app);

  // this.io = new SocketIOServer(this.httpsServer, {
  //   cors: {
  //     origin: ["http://localhost:3001"],
  //     methods: ["GET", "POST"],
  //     credentials: true,
  //   },
  // });

  public async start(): Promise<void> {
    console.log(`API Prefix: ${this.apiPrefix}`);

    await AppDataSource.initialize();
    await this.initializeServices();
    const streamSyncConsumer = new StreamSyncConsumer();
    await streamSyncConsumer.start();
    const userRepository = new UserRepository();
    const createUser = new CreateUser(userRepository);
    const updateUser = new UpdateUser(userRepository);
    const subscriptionRepository = new ChannelSubscriptionRepository();
    const channelRepository = new ChannelRepository();
    const subscribeChannelUseCase = new SubscribeToChannel(
      subscriptionRepository,
      channelRepository
    );
    const unSubscribechannelUseCase = new UnsubscribeFromChannel(
      subscriptionRepository,
      channelRepository
    );
    const createChannelUsecase = new CreateChannel(
      channelRepository,
      userRepository
    );

    const channelEditUseCase = new EditChannel(channelRepository);
    const updateUserRole = new UpdateUserRole(userRepository);

    const streamConsumer = new StreamServiceConsumer(
      createUser,
      updateUser,
      subscribeChannelUseCase,
      unSubscribechannelUseCase,
      createChannelUsecase,
      channelEditUseCase,
      updateUserRole
    );
    await streamConsumer.start();
    const getLatestStreamUsecase = new GetLatestStreamUsecase(
      new StreamQueryRepository()
    );
    const getSubscriptionStatus = new GetSubscriptionStatus(
      new ChannelSubscriptionRepository()
    );
    const getChannelById = new GetChannelById(new ChannelRepository());
    const getUserById = new GetUserById(new UserRepository());
    const inviteRepository = new InviteRepository();
    const stremRepository = new StreamRepository();

    const updateStreamParticipantUsecase = new UpdateStreamParticipantsUsecase(
      stremRepository
    );

    this.socketService = new SocketService(
      this.io,
      getLatestStreamUsecase,
      getSubscriptionStatus,
      getChannelById,
      getUserById,
      updateStreamParticipantUsecase
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
        message: `Welcome to Initial API! Endpoints available at http://localhost:${this.port}/`,
      });
    });

    // Handle socket connections
    this.io.on("connection", (socket: Socket) => {
      console.log(`New client connected: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    // Start HTTP server
    this.httpServer.listen(this.port, () => {
      console.log(`HTTP Server running on port ${this.port}...`);
    });
  }

  public getSocketIO(): SocketIOServer {
    return this.io;
  }

  private async initializeServices() {
    await Database.connect();
  }
}
