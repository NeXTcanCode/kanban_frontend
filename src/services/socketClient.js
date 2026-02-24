import { io } from "socket.io-client";

function socketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  return String(apiUrl).replace(/\/api\/?$/, "");
}

export function createSocketClient(token) {
  return io(socketBaseUrl(), {
    autoConnect: true,
    transports: ["websocket"],
    auth: { token }
  });
}

