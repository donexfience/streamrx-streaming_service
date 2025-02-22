"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamRoutes = void 0;
const express_1 = require("express");
class StreamRoutes {
    static get routes() {
        const router = (0, express_1.Router)();
        router.get("/", (req, res) => {
            res.status(200).send({ message: "Auth route is working!" });
        });
        return router;
    }
}
exports.StreamRoutes = StreamRoutes;
