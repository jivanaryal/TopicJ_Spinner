import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { SocketContext } from "../context/SocketContext";
import Button from "../components/Button";
import { FaRegCopy } from "react-icons/fa";
import AppNotification from "../components/Notification";

function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { socket, roomData, setRoomData } = useContext(SocketContext);

  const [nickname, setNickname] = useState(
    localStorage.getItem(`nickname_${roomCode}`) || ""
  );
  const [topic, setTopic] = useState("");
  const [joined, setJoined] = useState(
    !!localStorage.getItem(`nickname_${roomCode}`)
  );
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasPrompted = useRef(false);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setNotification({
        type: "success",
        message: "Link copied to clipboard!",
      });
    });
  };

  const handleGameStarted = useCallback(() => {
    navigate(`/game/${roomCode}`);
  }, [navigate, roomCode]);

  useEffect(() => {
    if (!socket) return;

    const joinRoom = async () => {
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

        localStorage.setItem("roomCode", roomCode); // Persist roomCode

        if (!joined && !hasPrompted.current) {
          hasPrompted.current = true;
          setShowNicknameModal(true);
        } else if (joined && nickname) {
          socket.emit("join-room", { roomCode, nickname });
        }

        // Redirect to GamePage if room is locked
        if (room.isLocked) {
          navigate(`/game/${roomCode}`);
        }
      } catch (error) {
        setNotification({ type: "error", message: "Room not found" });
        setTimeout(() => navigate("/"), 2000);
      } finally {
        setLoading(false);
      }
    };

    joinRoom();

    socket.on("game-started", handleGameStarted);
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
      if (room.isLocked) {
        navigate(`/game/${roomCode}`);
      }
    });

    return () => {
      socket.off("game-started", handleGameStarted);
      socket.off("room-update");
    };
  }, [
    socket,
    roomCode,
    joined,
    nickname,
    navigate,
    setRoomData,
    handleGameStarted,
  ]);

  const handleAddTopic = async () => {
    if (!topic.trim()) return;
    try {
      await axios.post(
        "https://topicj-spinner-1.onrender.com/api/rooms/add-topic",
        {
          roomCode,
          topic,
        }
      );
      setTopic("");
    } catch (error) {
      setNotification({
        type: "error",
        message: error.response?.data?.error || "Error adding topic",
      });
    }
  };

  const handleStartGame = async () => {
    if (!socket?.connected) {
      setNotification({
        type: "error",
        message: "Not connected to server. Please refresh.",
      });
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        "https://topicj-spinner-1.onrender.com/api/rooms/start-game",
        {
          roomCode,
        }
      );
      socket.emit("start-game", roomCode);
    } catch (error) {
      setNotification({
        type: "error",
        message: error.response?.data?.error || "Error starting game",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (nickname.trim()) {
      localStorage.setItem(`nickname_${roomCode}`, nickname.trim());
      localStorage.setItem("roomCode", roomCode); // Persist roomCode
      socket.emit("join-room", { roomCode, nickname: nickname.trim() });
      setJoined(true);
      setShowNicknameModal(false);
    }
  };

  const NicknameModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Join Room {roomCode}</h3>
        <input
          autoFocus
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your nickname"
          className="w-full p-2 border rounded mb-4"
          onKeyPress={(e) => e.key === "Enter" && handleJoinRoom()}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => navigate("/")}>
            Cancel
          </Button>
          <Button onClick={handleJoinRoom} disabled={!nickname.trim()}>
            Join
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      {notification && (
        <AppNotification
          {...notification}
          onClose={() => setNotification(null)}
        />
      )}

      {showNicknameModal && <NicknameModal />}

      {loading && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center">
          <p className="text-lg">Joining room...</p>
        </div>
      )}

      <h2 className="text-3xl font-bold text-blue-800 mb-4">
        Room: {roomCode}
      </h2>

      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <FaRegCopy size={18} />
          <span className="font-medium">Copy room link</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Users list */}
        <div>
          <h3 className="text-xl font-semibold mb-2">
            Users ({roomData.users?.length || 0}/5)
          </h3>
          <ul className="bg-white p-4 rounded-lg shadow">
            {roomData.users?.length > 0 ? (
              roomData.users.map((user) => (
                <li key={user.socketId} className="text-gray-700 py-1">
                  {user.nickname}
                </li>
              ))
            ) : (
              <li className="text-gray-500 py-1">No users joined</li>
            )}
          </ul>
        </div>

        {/* Topics list & add form */}
        <div>
          <h3 className="text-xl font-semibold mb-2">
            Topics ({roomData.topics?.length || 0}/25)
          </h3>
          <ul className="bg-white p-4 rounded-lg shadow">
            {roomData.topics?.length > 0 ? (
              roomData.topics.map((t, i) => (
                <li key={i} className="text-gray-700 py-1">
                  {t}
                </li>
              ))
            ) : (
              <li className="text-gray-500 py-1">No topics added</li>
            )}
          </ul>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic (min 3 characters)"
              className="flex-1 p-2 border rounded-lg"
              onKeyPress={(e) => e.key === "Enter" && handleAddTopic()}
            />
            <Button onClick={handleAddTopic} disabled={topic.trim().length < 3}>
              Add Topic
            </Button>
          </div>
        </div>
      </div>

      {roomData.topics?.length >= 4 && !roomData.isLocked && (
        <div className="mt-6 text-center">
          <Button
            onClick={handleStartGame}
            disabled={loading || !socket?.connected}
          >
            {loading
              ? "Starting..."
              : `Start Game (${roomData.topics?.length} topics)`}
          </Button>
        </div>
      )}
    </div>
  );
}

export default RoomPage;
