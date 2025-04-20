// src/components/Notification.jsx
import { useEffect } from "react";
import { FiAlertCircle, FiCheckCircle, FiInfo } from "react-icons/fi";

export default function AppNotification({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    error: <FiAlertCircle className="mr-2" />,
    success: <FiCheckCircle className="mr-2" />,
    info: <FiInfo className="mr-2" />,
  };

  const colors = {
    error: "bg-red-100 text-red-800",
    success: "bg-green-100 text-green-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <div
      className={`fixed top-4 right-4 flex items-center p-4 rounded-lg shadow-lg ${colors[type]}`}
    >
      {icons[type]}
      <span className="font-medium">{message}</span>
    </div>
  );
}
