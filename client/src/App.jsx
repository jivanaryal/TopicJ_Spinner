import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import LandingPage from "./pages/LandingPage";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";
import Header from "./components/Header";

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100">
          <Header />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/room/:roomCode" element={<RoomPage />} />
            <Route path="/game/:roomCode" element={<GamePage />} />
          </Routes>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;
