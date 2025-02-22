"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const constants_http_status_1 = require("./_lib/statusCodes/constants-http-status");
const dbConfig_1 = require("./config/dbConfig");
class Server {
    constructor(configOptions) {
        const { port, apiPrefix, routes } = configOptions;
        this.app = (0, express_1.default)();
        this.port = port;
        this.routes = routes;
        this.apiPrefix = apiPrefix;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`API Prefix: ${this.apiPrefix}`);
            // Initialize the database connection
            try {
                yield dbConfig_1.AppDataSource.initialize();
                console.log("Data Source has been initialized!");
            }
            catch (err) {
                console.error("Error during Data Source initialization:", err);
                process.exit(1); // Exit the process if the database connection fails
            }
            // Middlewares
            this.app.use(express_1.default.json());
            this.app.use(express_1.default.urlencoded({ extended: true }));
            this.app.use((0, cors_1.default)({
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
            }));
            this.app.use((0, morgan_1.default)("tiny"));
            // Routes
            this.app.use(this.apiPrefix, this.routes);
            // Test Endpoint
            this.app.get("/", (req, res) => {
                res.status(constants_http_status_1.HttpCode.OK).send({
                    message: `Welcome to Initial API! Endpoints available at http://localhost:${this.port}/`,
                });
            });
            // Start the server
            this.app.listen(this.port, () => {
                console.log(`Server running on port ${this.port}...`);
            });
        });
    }
}
exports.Server = Server;
