import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";

function LandingPage() {
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    try {
      const response = await axios.post(
        "https://topicj-spinner-1.onrender.com/api/rooms/create"
      );
      const { room } = response.data;
      navigate(`/room/${room.code}`);
    } catch (error) {
      alert("Error creating room");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center px-4">
      <h2 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4 animate-fade-in">
        Spin the Topic Wheel!
      </h2>
      <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl">
        Create a room, invite up to 5 friends, add topics, and spin the wheel
        for fun conversations. No sign-up needed!
      </p>
      <Button onClick={handleCreateRoom}>Create Room</Button>
    </div>
  );
}

export default LandingPage;
