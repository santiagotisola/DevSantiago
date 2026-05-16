import mongoose, { Schema, Document } from "mongoose";
import { IWhatsAppMessage } from "../types/whatsapp.types";

export interface IWhatsAppMessageDoc extends IWhatsAppMessage, Document {}

const WhatsAppMessageSchema = new Schema<IWhatsAppMessageDoc>(
  {
    sessionId: { type: String, required: true, index: true },
    direcao: { type: String, enum: ["entrada", "saida"], required: true },
    conteudo: { type: String, required: true },
    tipo: { type: String, enum: ["texto", "imagem", "arquivo"], default: "texto" },
    criadoEm: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// TTL: histórico de mensagens expira após 7 dias
WhatsAppMessageSchema.index({ criadoEm: 1 }, { expireAfterSeconds: 604800 });

export const WhatsAppMessageModel = mongoose.model<IWhatsAppMessageDoc>(
  "WhatsAppMessage",
  WhatsAppMessageSchema
);
