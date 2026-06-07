import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as path from "path";
import * as fs from "fs";
import { processarMensagem } from "../flows/flow.processor";

const AUTH_DIR = path.resolve(process.cwd(), "whatsapp-auth");

let sock: WASocket | null = null;
let qrCodeAtual: string | null = null;
let statusConexao: "desconectado" | "aguardando_qr" | "conectado" = "desconectado";

export function getQRCode() {
  return qrCodeAtual;
}

export function getStatus() {
  return statusConexao;
}

export async function iniciarWhatsApp() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: undefined as any,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeAtual = qr;
      statusConexao = "aguardando_qr";
      console.log("[WhatsApp] QR Code gerado, aguardando scan...");
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const reconectar = code !== DisconnectReason.loggedOut;
      statusConexao = "desconectado";
      qrCodeAtual = null;
      console.log("[WhatsApp] Desconectado. Reconectar:", reconectar);
      if (reconectar) iniciarWhatsApp();
    }

    if (connection === "open") {
      qrCodeAtual = null;
      statusConexao = "conectado";
      console.log("[WhatsApp] Conectado com sucesso!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.message) {
        await processarMensagem(sock!, msg);
      }
    }
  });

  return sock;
}

export async function enviarMensagem(para: string, texto: string) {
  if (!sock || statusConexao !== "conectado") {
    throw new Error("WhatsApp não está conectado");
  }
  const jid = para.includes("@") ? para : `${para}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: texto });
}

export async function desconectar() {
  if (sock) {
    await sock.logout();
    sock = null;
  }
  statusConexao = "desconectado";
  qrCodeAtual = null;
}
