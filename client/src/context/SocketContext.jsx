import { createContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [roomData, setRoomData] = useState({
    users: [],
    topics: [],
    currentTurn: null,
    selectedTopic: null,
    gameStarted: false,
    roomCode: null,
    prizeNumber: null,
    isLocked: false,
    error: null,
  });

  useEffect(() => {
    const newSocket = io("http://localhost:3000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      // Rejoin room if nickname and roomCode exist in localStorage
      const roomCode = localStorage.getItem("roomCode");
      const nickname = localStorage.getItem(`nickname_${roomCode}`);
      if (roomCode && nickname) {
        newSocket.emit("join-room", { roomCode, nickname });
      }
    });

    newSocket.on("room-update", (room) => {
      console.log("Received room-update:", room);
      setRoomData((prev) => ({
        ...prev,
        roomCode: room.code,
        users: room.participants,
        topics: room.topics,
        isLocked: room.isLocked,
        currentTurn: room.currentTurn,
        selectedTopic: room.selectedTopic,
        gameStarted: room.isLocked,
      }));
    });

    newSocket.on("room-topics", (topics) => {
      console.log("Received room-topics:", topics);
      setRoomData((prev) => ({ ...prev, topics }));
    });

    newSocket.on("game-started", (room) => {
      console.log("Received game-started:", room);
      setRoomData((prev) => ({
        ...prev,
        roomCode: room.code,
        gameStarted: true,
        isLocked: room.isLocked,
        currentTurn: room.currentTurn,
        users: room.participants,
        topics: room.topics,
      }));
    });

    newSocket.on("start-spin", ({ prizeNumber }) => {
      console.log("Received start-spin:", { prizeNumber });
      setRoomData((prev) => ({ ...prev, prizeNumber }));
    });

    newSocket.on("spin-result", ({ topic, currentTurn, topics }) => {
      console.log("Received spin-result:", { topic, currentTurn, topics });
      setRoomData((prev) => ({
        ...prev,
        selectedTopic: topic,
        currentTurn,
        topics,
        prizeNumber: null,
      }));
    });

    newSocket.on("error", (message) => {
      console.error("Socket error:", message);
      setRoomData((prev) => ({ ...prev, error: message }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, roomData, setRoomData }}>
      {children}
    </SocketContext.Provider>
  );
};
