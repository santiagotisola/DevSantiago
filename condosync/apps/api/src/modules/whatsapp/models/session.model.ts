import mongoose, { Schema, Document } from "mongoose";
import { IWhatsAppSession, EstadoWhatsApp } from "../types/whatsapp.types";

export interface IWhatsAppSessionDoc extends IWhatsAppSession, Document {}

const WhatsAppSessionSchema = new Schema<IWhatsAppSessionDoc>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    nome: { type: String, default: "" },
    estado: {
      type: String,
      enum: ["inicio", "identificacao", "unidade", "motivo"],
      default: "inicio",
    },
    dadosParciais: {
      nome: { type: String },
      unidade: { type: String },
      motivo: { type: String },
    },
    ultimaMensagem: { type: Date, default: Date.now },
    ativo: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "criadoEm", updatedAt: "atualizadoEm" },
  }
);

// TTL: sessões expiram após 24h de inatividade
WhatsAppSessionSchema.index({ ultimaMensagem: 1 }, { expireAfterSeconds: 86400 });

export const WhatsAppSessionModel = mongoose.model<IWhatsAppSessionDoc>(
  "WhatsAppSession",
  WhatsAppSessionSchema
);
