import express from "express";
import {
  addTopic,
  createRoom,
  getRoom,
  startGame,
} from "../controllers/roomController.js";

const router = express.Router();

router.post("/create", createRoom);
router.get("/:roomCode", getRoom);
router.post("/add-topic", addTopic);
router.post("/start-game", startGame);

export default router;
