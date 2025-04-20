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

        // Only navigate if room is explicitly not locked
        if (
          !room.isLocked &&
          window.location.pathname !== `/room/${roomCode}`
        ) {
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

    const debounce = (func, wait) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    };

    const validateRoomUpdate = (room) => {
      // Ignore invalid updates (e.g., locked room with no participants)
      if (
        room.isLocked &&
        (!room.participants || room.participants.length === 0)
      ) {
        console.warn("Ignoring invalid room-update:", room);
        return false;
      }
      return true;
    };

    const debouncedRoomUpdate = debounce((room) => {
      if (!validateRoomUpdate(room)) return;
      console.log("Processing room-update:", {
        isLocked: room.isLocked,
        participants: room.participants.length,
      });
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

      // Only navigate if room is explicitly not locked
      if (!room.isLocked && window.location.pathname !== `/room/${roomCode}`) {
        navigate(`/room/${roomCode}`);
      }
    }, 1500); // Increased to 1500ms for Render latency

    socket.on("room-update", debouncedRoomUpdate);
    socket.on("error", (message) => {
      setNotification({ type: "error", message });
    });

    return () => {
      socket.off("room-update", debouncedRoomUpdate);
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
