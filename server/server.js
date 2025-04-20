import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { AppDataSource } from "./data-source.js";
import roomRoutes from "./src/routes/roomRoutes.js";
import cors from "cors";
import cron from "node-cron";

// Load environment variables
dotenv.config();

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
  methods: ["GET", "POST"],
};

// Socket.IO setup
export const io = new Server(server, {
  cors: corsOptions,
});

// Database initialization function
const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log("📦 Connected to PostgreSQL via TypeORM");

    if (process.env.NODE_ENV !== "production") {
      await AppDataSource.synchronize();
      console.log("🔄 Database synchronized");
    }
  } catch (err) {
    console.error("❌ DB Connection error:", err);
    process.exit(1);
  }
};

// Cron job to clean up inactive rooms (runs every 10 minutes)
const setupCronJob = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const roomRepo = AppDataSource.getRepository("Room");
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      await roomRepo
        .createQueryBuilder()
        .delete()
        .where("participants = :empty", { empty: "[]" })
        .andWhere("lastActiveAt < :timestamp", { timestamp: tenMinutesAgo })
        .andWhere("isLocked = :locked", { locked: false })
        .execute();
    } catch (err) {
      console.error("❌ Cron job error:", err);
    }
  });
};

// Socket.IO connection handling
const setupSocketIO = () => {
  io.on("connection", (socket) => {
    console.log("🧑 User connected:", socket.id);
    let currentRoomCode = null;

    // Helper function to fetch a room
    const getRoom = async (roomCode) => {
      console.log(`Fetching room with code: ${roomCode}`);
      const roomRepo = AppDataSource.getRepository("Room");
      const room = await roomRepo.findOneBy({ code: roomCode });
      if (!room) console.log(`Room not found: ${roomCode}`);
      return room;
    };

    // Helper function to validate turn
    const validateTurn = (room, socket) => {
      if (!room) throw new Error("Room not found");
      if (socket.id !== room.currentTurn) throw new Error("Not your turn");
    };

    // Handle joining a room
    socket.on("join-room", async ({ roomCode, nickname }) => {
      try {
        const roomRepo = AppDataSource.getRepository("Room");

        // Remove socket from any existing rooms
        const allRooms = await roomRepo.find();
        for (const r of allRooms) {
          const index = r.participants.findIndex(
            (p) => p.socketId === socket.id
          );
          if (index > -1) {
            r.participants.splice(index, 1);
            if (r.currentTurn === socket.id) {
              r.currentTurn = r.participants[0]?.socketId || null;
            }
            r.lastActiveAt = new Date();
            await roomRepo.save(r);
            io.to(r.code).emit("room-update", r);
            socket.leave(r.code);
          }
        }

        // Join the new room
        const room = await getRoom(roomCode);
        if (!room) throw new Error("Room not found");
        if (room.isLocked) throw new Error("Game already started");
        if (room.participants.length >= 5) throw new Error("Room full");

        const participant = {
          nickname: nickname.trim().substring(0, 20),
          socketId: socket.id,
        };

        room.participants.push(participant);
        room.lastActiveAt = new Date();
        await roomRepo.save(room);

        currentRoomCode = roomCode;
        socket.join(roomCode);
        io.to(roomCode).emit("room-update", room);
      } catch (err) {
        socket.emit("error", err.message);
      }
    });

    // Handle starting the game
    socket.on("start-game", async (roomCode) => {
      try {
        const room = await getRoom(roomCode);
        if (!room) throw new Error("Room not found");
        if (room.isLocked) throw new Error("Game already started");
        if (room.participants.length === 0)
          throw new Error("No players in the room");
        if (room.topics.length < 4)
          throw new Error("Minimum 4 topics required");

        room.isLocked = true;
        room.currentTurn = room.participants[0]?.socketId || null;
        room.lastActiveAt = new Date();
        const roomRepo = AppDataSource.getRepository("Room");
        await roomRepo.save(room);

        io.to(roomCode).emit("game-started", room);
        io.to(roomCode).emit("room-update", room);
      } catch (err) {
        socket.emit("error", err.message);
      }
    });

    // Handle starting a spin
    socket.on("start-spin", async (roomCode) => {
      try {
        const room = await getRoom(roomCode);
        validateTurn(room, socket);

        if (room.isProcessingSpin) {
          throw new Error("Spin already in progress");
        }

        room.isProcessingSpin = true;
        const randomIndex = Math.floor(Math.random() * room.topics.length);
        room.selectedTopic = room.topics[randomIndex];
        room.lastActiveAt = new Date();
        const roomRepo = AppDataSource.getRepository("Room");
        await roomRepo.save(room);

        io.to(roomCode).emit("start-spin", { prizeNumber: randomIndex });
      } catch (err) {
        console.error(`Start-spin error for room ${roomCode}:`, err.message);
        socket.emit("error", err.message);
      }
    });

    // Handle completing a spin
    socket.on("spin", async (roomCode) => {
      try {
        const room = await getRoom(roomCode);
        validateTurn(room, socket);

        if (room.topics.length === 0) {
          throw new Error("No topics left! Game over.");
        }
        if (!room.selectedTopic) {
          throw new Error("No topic selected");
        }

        const selectedTopic = room.selectedTopic;
        room.topics = room.topics.filter((t) => t !== room.selectedTopic);
        room.selectedTopic = null;
        room.isProcessingSpin = false;

        const currentIdx = room.participants.findIndex(
          (p) => p.socketId === room.currentTurn
        );
        const nextIdx = (currentIdx + 1) % room.participants.length;
        room.currentTurn = room.participants[nextIdx]?.socketId || null;
        room.lastActiveAt = new Date();
        const roomRepo = AppDataSource.getRepository("Room");
        await roomRepo.save(room);

        io.to(roomCode).emit("spin-result", {
          topic: selectedTopic,
          currentTurn: room.currentTurn,
          topics: room.topics,
        });
      } catch (err) {
        console.error(`Spin error for room ${roomCode}:`, err.message);
        socket.emit("error", err.message);
      }
    });

    // Handle socket disconnection
    socket.on("disconnect", async () => {
      if (!currentRoomCode) return;

      try {
        const room = await getRoom(currentRoomCode);
        if (!room) return; // Room may have been deleted

        const participantIndex = room.participants.findIndex(
          (p) => p.socketId === socket.id
        );

        if (participantIndex > -1) {
          room.participants.splice(participantIndex, 1);
          if (room.currentTurn === socket.id) {
            room.currentTurn = room.participants[0]?.socketId || null;
          }
          room.lastActiveAt = new Date();
          const roomRepo = AppDataSource.getRepository("Room");
          await roomRepo.save(room);
          io.to(currentRoomCode).emit("room-update", room);
        }
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    });
  });
};

// Start the server
const startServer = async () => {
  await initializeDatabase();
  setupCronJob();
  setupSocketIO();

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use("/api/rooms", roomRoutes);

  server.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
  });
};

startServer();
