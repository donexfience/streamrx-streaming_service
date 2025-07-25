import "reflect-metadata";
import { DataSource } from "typeorm";
import { UserModel } from "../infrastructure/models/user";
import { ChannelModel } from "../infrastructure/models/channel";
import { ChannelSubscriptionModel } from "../infrastructure/models/subscription";
import { StreamModel } from "../infrastructure/models/command/stream";
import { InviteModel } from "../infrastructure/models/invite";
import { FriendModel } from "../infrastructure/models/friend";
import { StreamSettingsModel } from "../infrastructure/models/streamSettingModel";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "postgres",
  port: 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true,
  logging: true,
  entities: [
    UserModel,
    ChannelModel,
    ChannelSubscriptionModel,
    StreamModel,
    InviteModel,
    FriendModel,
    StreamSettingsModel
  ],
  migrations: [],
  subscribers: [],
});

AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
  })
  .catch((err) => {
    console.error("Error during Data Source initialization:", err);
  });
