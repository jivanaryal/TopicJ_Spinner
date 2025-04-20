// src/data-source.js
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import Room from "./src/models/Room.js";
dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: false,
  entities: [Room],
  migrations: [],
  subscribers: [],
});
