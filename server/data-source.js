// src/data-source.js
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import Room from "./src/models/Room.js";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL, // e.g. "postgresql://user:pass@…amazonaws.com/db?sslmode=require"
  ssl: { rejectUnauthorized: false }, // Neon needs SSL but Node must skip cert check
  synchronize: process.env.NODE_ENV !== "production",
  logging: false,
  entities: [Room],
  migrations: [],
  subscribers: [],
});
