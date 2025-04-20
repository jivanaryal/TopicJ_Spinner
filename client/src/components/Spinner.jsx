import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import { Wheel } from "react-custom-roulette";
import AppNotification from "./Notification";

function Spinner({ topics }) {
  const { socket, roomData, setRoomData } = useContext(SocketContext);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const data = topics.map((topic) => ({ option: topic }));

  useEffect(() => {
    const handleStartSpin = ({ prizeNumber }) => {
      if (!mustSpin) {
        setPrizeNumber(prizeNumber);
        setMustSpin(true);
      }
    };

    const handleSpinResult = ({ topic, currentTurn, topics }) => {
      setMustSpin(false);
      setRoomData((prev) => ({
        ...prev,
        selectedTopic: topic,
        currentTurn,
        topics,
      }));
    };

    socket.on("start-spin", handleStartSpin);
    socket.on("spin-result", handleSpinResult);

    return () => {
      socket.off("start-spin", handleStartSpin);
      socket.off("spin-result", handleSpinResult);
    };
  }, [socket, setRoomData, mustSpin]);

  const handleSpinClick = () => {
    if (!roomData?.currentTurn) {
      setErrorMessage("No player turn assigned!");
      return;
    }
    if (socket.id !== roomData.currentTurn || mustSpin) return;
    socket.emit("start-spin", roomData.roomCode);
  };

  const handleSpinStop = () => {
    setMustSpin(false);
    socket.emit("spin", roomData.roomCode);
  };

  useEffect(() => {
    const handleError = (msg) => {
      setErrorMessage(msg);
      setMustSpin(false);
    };

    socket.on("error", handleError);
    return () => socket.off("error", handleError);
  }, [socket]);

  return (
    <div className="flex flex-col items-center">
      {errorMessage && (
        <AppNotification
          message={errorMessage}
          type="error"
          onClose={() => setErrorMessage("")}
        />
      )}
      <Wheel
        mustStartSpinning={mustSpin}
        prizeNumber={prizeNumber}
        data={data}
        backgroundColors={[
          "#FF6B6B",
          "#4ECDC4",
          "#45B7D1",
          "#96CEB4",
          "#FFEEAD",
        ]}
        textColors={["#FFFFFF"]}
        outerBorderColor="#1E3A8A"
        radiusLineColor="#1E3A8A"
        radiusLineWidth={2}
        fontSize={16}
        onStopSpinning={handleSpinStop}
      />
      <button
        onClick={handleSpinClick}
        disabled={socket.id !== roomData.currentTurn || mustSpin}
        className={`mt-4 px-6 py-2 rounded text-white transition duration-300 ${
          mustSpin
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        title={
          socket.id !== roomData.currentTurn
            ? `Wait for ${
                roomData?.users?.find(
                  (u) => u.socketId === roomData.currentTurn
                )?.nickname || "other player"
              }'s turn`
            : mustSpin
            ? "Spinning..."
            : "Spin the wheel"
        }
      >
        {mustSpin ? "Spinning..." : "Spin"}
      </button>
    </div>
  );
}

export default Spinner;
