import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { SocketContext } from "../context/SocketContext";
import Spinner from "../components/Spinner";
import AppNotification from "../components/Notification";

function GamePage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { socket, roomData, setRoomData } = useContext(SocketContext);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const fetchRoomState = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `https://topicj-spinner-1.onrender.com/api/rooms/${roomCode}`
        );
        const room = data.room;

        setRoomData({
          roomCode: room.code,
          users: room.participants,
          topics: room.topics,
          isLocked: room.isLocked,
          currentTurn: room.currentTurn,
          selectedTopic: room.selectedTopic,
          gameStarted: room.isLocked,
        });

        // Rejoin room if nickname exists
        const nickname = localStorage.getItem(`nickname_${roomCode}`);
        if (nickname && socket.connected) {
          socket.emit("join-room", { roomCode, nickname });
        }

        // Redirect if room is not locked or invalid
        if (!room.isLocked || room.participants.length === 0) {
          navigate(`/room/${roomCode}`);
        }
      } catch (error) {
        setNotification({ type: "error", message: "Room not found" });
        setTimeout(() => navigate("/"), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomState();

    socket.on("room-update", (room) => {
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

      // Redirect if room is not locked or no players
      if (!room.isLocked || room.participants.length === 0) {
        navigate(`/room/${roomCode}`);
      }
    });

    socket.on("error", (message) => {
      setNotification({ type: "error", message });
    });

    return () => {
      socket.off("room-update");
      socket.off("error");
    };
  }, [socket, roomCode, navigate, setRoomData]);

  const currentPlayer = roomData.users?.find(
    (u) => u.socketId === roomData.currentTurn
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-lg">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 text-center">
      {notification && (
        <AppNotification
          {...notification}
          onClose={() => setNotification(null)}
        />
      )}
      <h2 className="text-3xl font-bold text-blue-800 mb-4">
        Game: {roomCode}
      </h2>
      <p className="text-lg mb-4">
        Current Turn:{" "}
        {currentPlayer
          ? currentPlayer.nickname
          : roomData.users?.length > 0
          ? "Initializing turn..."
          : "No players"}
      </p>
      {roomData.users?.length === 0 && (
        <p className="text-xl text-red-600 mb-4">No players in the room</p>
      )}
      {roomData.selectedTopic && (
        <p className="text-xl text-green-600 mb-4">
          Selected Topic: {roomData.selectedTopic}
        </p>
      )}
      {roomData.topics?.length > 0 ? (
        <Spinner topics={roomData.topics} />
      ) : (
        <p className="text-xl text-red-600">No topics left! Game over.</p>
      )}
    </div>
  );
}

export default GamePage;
