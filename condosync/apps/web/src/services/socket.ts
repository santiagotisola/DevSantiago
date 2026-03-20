import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

function resolveSocketUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3333";

  const { protocol, hostname, port } = window.location;
  if (hostname === "localhost" && port === "5173") {
    return `${protocol}//${hostname}:3333`;
  }

  return window.location.origin;
}

export function connectRealtime(
  accessToken: string,
  userId: string,
  condominiumId: string | null,
): () => void {
  const baseUrl = resolveSocketUrl();

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(baseUrl, {
    auth: { token: accessToken },
    transports: ["websocket"],
    withCredentials: true,
  });

  const joinRooms = () => {
    if (!socket) return;
    socket.emit("join:user", userId);
    if (condominiumId) {
      socket.emit("join:condominium", condominiumId);
    }
  };

  socket.on("connect", joinRooms);
  if (socket.connected) joinRooms();

  return () => {
    if (!socket) return;
    socket.off("connect", joinRooms);
    socket.disconnect();
    socket = null;
  };
}
