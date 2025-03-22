import { Request, Response, Router } from "express";
import { StreamRoutes } from "../../infrastructure/routes/streamRoutes";
import { FrinedRoutes } from "../../infrastructure/routes/friendRoutes";

export class AppRoutes {
  static get routes(): Router {
    const router = Router();

    router.get("/", (req: Request, res: Response) => {
      res.status(200).send({ message: "API is working!" });
    });
    router.use("/streamer", StreamRoutes.routes);
    router.use("/friends", FrinedRoutes.routes);

    return router;
  }
}
