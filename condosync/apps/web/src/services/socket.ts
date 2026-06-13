import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Retorna a conexão de socket atual (ou null se `connectRealtime` ainda
 * não rodou / foi desconectada). Telas que assinam eventos devem tratar
 * null sem crash e manter polling de fallback.
 */
export function getSocket(): Socket | null {
  return socket;
}

function resolveSocketUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3333";

  // Em Vite dev (import.meta.env.DEV) o frontend roda em 5173 sem proxy
  // para /socket.io/, então aponta direto para a API em 3333.
  // Em qualquer outro caso (nginx servindo build, prod) usa same-origin
  // — o nginx já proxia /socket.io/ — evitando CSP connect-src cross-origin.
  if (import.meta.env.DEV) {
    const { protocol, hostname } = window.location;
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
