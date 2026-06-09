import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

export async function connectMongoDB() {
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("[MongoDB] Conectado com sucesso");
  } catch (error) {
    console.error("[MongoDB] Erro ao conectar:", error);
    throw error;
  }
}

export async function disconnectMongoDB() {
  await mongoose.disconnect();
  console.log("[MongoDB] Desconectado");
}
