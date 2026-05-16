export type EstadoWhatsApp = "inicio" | "identificacao" | "unidade" | "motivo";

export interface IWhatsAppSession {
  phone: string;
  nome: string;
  estado: EstadoWhatsApp;
  dadosParciais: {
    nome?: string;
    unidade?: string;
    motivo?: string;
  };
  ultimaMensagem?: Date;
  criadoEm: Date;
  atualizadoEm?: Date;
  ativo: boolean;
}

export interface IWhatsAppMessage {
  sessionId: string;
  direcao: "entrada" | "saida";
  conteudo: string;
  tipo: "texto" | "imagem" | "arquivo";
  criadoEm: Date;
}
