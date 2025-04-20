import { AppDataSource } from "../../data-source.js";
import Room from "../models/Room.js";
import { io } from "../../index.js"; // Import the io instance from index.js

const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "room" + code;
};

export const createRoom = async (req, res) => {
  try {
    const roomRepo = AppDataSource.getRepository("Room");
    let roomCode;
    let existing;
    do {
      roomCode = generateRoomCode();
      existing = await roomRepo.findOneBy({ code: roomCode });
    } while (existing);

    const newRoom = roomRepo.create({
      code: roomCode,
      participants: [],
      topics: [],
      isLocked: false,
      currentTurn: null,
    });

    await roomRepo.save(newRoom);
    return res.status(201).json({
      room: newRoom,
      shareableLink: `${process.env.FRONTEND_URL}/room/${newRoom.code}`,
    });
  } catch (err) {
    console.error("Room creation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const roomRepo = AppDataSource.getRepository("Room");
    const room = await roomRepo.findOneBy({ code: roomCode });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    return res.status(200).json({ room });
  } catch (err) {
    console.error("Error fetching room:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addTopic = async (req, res) => {
  try {
    const { roomCode, topic } = req.body;
    const roomRepo = AppDataSource.getRepository("Room");
    const room = await roomRepo.findOneBy({ code: roomCode });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    if (room.topics.length >= 25) {
      return res.status(400).json({ error: "Maximum 25 topics allowed" });
    }
    room.topics.push(topic);
    room.lastActiveAt = new Date(); // 👈 Add this line
    await roomRepo.save(room);
    io.to(roomCode).emit("room-topics", room.topics);
    return res.status(200).json({ room });
  } catch (err) {
    console.error("Error adding topic:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const startGame = async (req, res) => {
  try {
    const { roomCode } = req.body;
    const roomRepo = AppDataSource.getRepository("Room");
    const room = await roomRepo.findOneBy({ code: roomCode });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    if (room.topics.length < 4) {
      return res.status(400).json({ error: "Minimum 5 topics required" });
    }
    room.lastActiveAt = new Date(); // 👈 Add this
    await roomRepo.save(room);
    return res.status(200).json({ message: "Game can start" });
  } catch (err) {
    console.error("Error starting game:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
