import { Router } from "express";
import { StreamController } from "../../presentation/controller/streamerController";

export class StreamRoutes {
  static get routes(): Router {
    const router = Router();
    const controller = new StreamController();

    router.post("/", (req, res) => controller.createStream(req, res));
    router.get("/:id", (req, res) => controller.getStream(req, res));
    router.get("/channel/:channelId", (req, res) =>
      controller.getChannelStreams(req, res)
    );
    router.put("/:id", (req, res) => controller.EditStream(req, res));

    return router;
  }
}
