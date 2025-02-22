import "reflect-metadata";
import { DataSource } from "typeorm";
import { UserModel } from "../infrastructure/models/user";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "postgres",
  port: 5432,
  username: "postgres",
  password: "postgres",
  database: "streaming_database",
  synchronize: true,
  logging: true,
  entities: [UserModel],
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
