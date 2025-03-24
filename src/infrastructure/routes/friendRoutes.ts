import { Router } from "express";
import { FriendController } from "../../presentation/controller/FriendController";

export class FrinedRoutes {
  static get routes(): Router {
    const router = Router();
    const controller = new FriendController();
    router.get("/users/:userId/streamers", (req, res) =>
      controller.getStreamers(req, res)
    );
    router.post("/users/:userId/friend-request", (req, res) =>
      controller.sendFriendRequest(req, res)
    );
    router.post("/users/:userId/accept-friend", (req, res) =>
      controller.acceptFriendRequest(req, res)
    );
    router.post("/users/:userId/block", (req, res) =>
      controller.blockFriend(req, res)
    );
    router.get("/user/:userId/GetFriends", (req, res) =>
      controller.getFriendOfStreamer(req, res)
    );
    

    return router;
  }
}
