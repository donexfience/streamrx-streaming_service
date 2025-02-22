import cors from "cors";
import express, {
  type Router,
  type Request,
  type Response,
  type Application,
} from "express";
import morgan from "morgan";
import { HttpCode } from "./_lib/statusCodes/constants-http-status";
import { AppDataSource } from "./config/dbConfig";

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

  constructor(configOptions: ServerOptions) {
    const { port, apiPrefix, routes } = configOptions;
    this.app = express();
    this.port = port;
    this.routes = routes;
    this.apiPrefix = apiPrefix;
  }

  public async start(): Promise<void> {
    console.log(`API Prefix: ${this.apiPrefix}`);

    // Initialize the database connection
    try {
      await AppDataSource.initialize();
      console.log("Data Source has been initialized!");
    } catch (err) {
      console.error("Error during Data Source initialization:", err);
      process.exit(1); // Exit the process if the database connection fails
    }

    // Middlewares
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(
      cors({
        origin: ["http://localhost:3001"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true,
        allowedHeaders: [
          "Origin",
          "X-Requested-With",
          "Content-Type",
          "Accept",
          "Authorization",
          "accesstoken",
          "refreshtoken",
        ],
        exposedHeaders: ["Authorization"],
      })
    );
    this.app.use(morgan("tiny"));

    // Routes
    this.app.use(this.apiPrefix, this.routes);

    // Test Endpoint
    this.app.get("/", (req: Request, res: Response) => {
      res.status(HttpCode.OK).send({
        message: `Welcome to Initial API! Endpoints available at http://localhost:${this.port}/`,
      });
    });

    // Start the server
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}...`);
    });
  }
}
