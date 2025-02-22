import { Server } from "./index";
import dotenv from "dotenv";
import { AppRoutes } from "./presentation/express-http/routes";
dotenv.config();
(() => {
  main();
})();

function main(): void {
  const apiPrefix = process.env.API_PREFIX || "/api";
  const port = Number(process.env.PORT) || 3000;
  const server = new Server({
    routes: AppRoutes.routes,
    apiPrefix: apiPrefix,
    port: port,
  });

  void server.start();
}
