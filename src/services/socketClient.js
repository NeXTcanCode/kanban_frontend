import { io } from "socket.io-client";

const DEFAULT_API_URL = "https://kanban-backend-2l68.onrender.com/api";

function socketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
  return String(apiUrl).replace(/\/api\/?$/, "");
}

export function createSocketClient(token) {
  return io(socketBaseUrl(), {
    autoConnect: true,
    transports: ["websocket"],
    auth: { token }
  });
}
