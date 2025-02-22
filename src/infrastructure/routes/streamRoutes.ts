import { Request, Response, Router } from "express";

export class StreamRoutes {
  static get routes(): Router {
    const router = Router();

    router.get("/", (req: Request, res: Response) => {
      res.status(200).send({ message: "Auth route is working!" });
    });

    return router;
  }
}
