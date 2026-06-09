# 🚀 QUICK START - WhatsApp MVP (Comece AGORA!)

**Tempo**: 30 minutos para setup básico  
**Objetivo**: Primeiro endpoint funcionando  
**Data**: 15 de maio de 2026

---

## ⏱️ TIMELINE

```
T+00:00 - Começar
T+05:00 - MongoDB rodando
T+10:00 - Dependências instaladas
T+15:00 - Variáveis de ambiente
T+20:00 - Primeiro arquivo criado
T+30:00 - PRONTO: Testar status endpoint
```

---

## STEP 1: MongoDB no Docker (5 min)

### 1a. Adicionar ao docker-compose.yml

Na raiz do projeto (`c:\Users\Santiago\DevSantiago\condosync\docker-compose.yml`), ANTES da linha `volumes:`:

```yaml
  mongodb:
    image: mongo:7-alpine
    container_name: condosync-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: condosync-whatsapp
    volumes:
      - mongo-data:/data/db
    networks:
      - condosync-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh -u admin -p admin123 --quiet
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

### 1b. Adicionar volume

Na seção `volumes:`:

```yaml
volumes:
  mongo-data:
  # ... outros volumes ...
```

### 1c. Iniciar

```bash
cd c:\Users\Santiago\DevSantiago\condosync
docker-compose up mongodb -d

# Verificar
docker-compose ps mongodb
# Esperado: Status "healthy" ou "running"
```

---

## STEP 2: Instalar Dependências (5 min)

```bash
cd apps/api

npm install \
  @whiskeysockets/baileys@latest \
  qrcode@latest \
  qrcode-terminal@latest \
  mongoose@latest \
  sharp@latest

# Verificar
npm list @whiskeysockets/baileys
# Esperado: versão 7.x+
```

---

## STEP 3: Variáveis de Ambiente (5 min)

Abrir `apps/api/.env` e adicionar:

```env
# WhatsApp
MONGODB_URI=mongodb://admin:admin123@localhost:27017/condosync-whatsapp?authSource=admin
WHATSAPP_ENABLED=true
WHATSAPP_CONDOMINIUM_ID=1
```

---

## STEP 4: Criar Pastas (2 min)

```bash
mkdir -p apps/api/src/modules/whatsapp/{services,models,flows,types,dto,utils}
```

---

## STEP 5: Primeiro Arquivo - Types (5 min)

Criar: `apps/api/src/modules/whatsapp/types/whatsapp.types.ts`

```typescript
export type EstadoWhatsApp = "inicio" | "identificacao" | "unidade" | "motivo";

export interface IWhatsAppSession {
  _id?: string;
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
  _id?: string;
  sessionId: string;
  direcao: "entrada" | "saida";
  conteudo: string;
  tipo: "texto" | "imagem" | "arquivo";
  criadoEm: Date;
}
```

---

## STEP 6: Testar Status (3 min)

```bash
# No terminal do VS Code, na pasta condosync:
npm start

# Em outro terminal, testar:
curl http://localhost:3333/api/v1/health

# Esperado: 200 OK
```

**✅ Pronto!** API respondendo, MongoDB pronto, tipos criados.

---

## 📋 PRÓXIMAS 20 TAREFAS

Depois do setup básico, seguir o backlog:

```
Dias 1-2 (hoje + amanhã):
[1] ✅ MongoDB docker-compose
[2] ✅ npm install dependências
[3] ✅ .env variables
[4] ✅ Estrutura pastas + types
[5] Baileys service
[6] WhatsApp routes
[7] WhatsApp controller
[8] Processor flow (máquina estados)

Dias 3-4:
[9] Visitante service
[10] Criar visita
[11] Listar unidades
[12] Notificação morador

Dias 5-6:
[13] Testes endpoints
[14] Testes E2E manual
[15] MongoDB persistence
[16] Logs

Dias 7-10:
[17] README
[18] Docker deploy
[19] Testes finais
[20] Go-live
```

---

## 🎯 GO-LIVE CHECKLIST (para fim da semana)

```
[ ] Conexão WhatsApp funcionando
[ ] Fluxo 4 estados completo
[ ] Visitação criada automaticamente
[ ] Dados persistem em MongoDB
[ ] Zero bugs críticos
[ ] Documentação completa
[ ] Deploy homolog sucesso
```

---

## ❓ TROUBLESHOOTING

### MongoDB não conecta

```bash
# Verificar container
docker-compose logs mongodb

# Reiniciar
docker-compose restart mongodb

# Reset total
docker-compose down
docker volume rm condosync_mongo-data
docker-compose up mongodb -d
```

### npm install falha

```bash
# Limpar cache
npm cache clean --force

# Tentar novamente
npm install
```

### Porta 27017 já em uso

```bash
# Encontrar processo
netstat -ano | findstr :27017

# Matar processo
taskkill /PID <PID> /F
```

---

## 📞 SUPORTE

Se precisar de ajuda:

1. Consultar `BACKLOG_WHATSAPP_MVP.md` (tarefas detalhadas)
2. Consultar `ARQUITETURA_WHATSAPP_MVP.md` (design completo)
3. Ver logs: `docker-compose logs api`
4. Ver MongoDB: `mongosh -u admin -p admin123 localhost:27017`

---

## 🎉 PRÓXIMO PASSO

Agora que setup básico está pronto:

1. **Tarefa [5]**: Implementar `baileys.service.ts`
   - Arquivo: `apps/api/src/modules/whatsapp/services/baileys.service.ts`
   - Tempo: 3h
   - Quer que crie este arquivo agora?

2. **Ou preferir**: Testar setup com curl antes?

**Execute este comando agora para validar:**

```bash
curl -s http://localhost:3333/api/v1/health | jq '.'
```

Se retornar JSON → ✅ Tudo funcionando!

---

**Status**: 🚀 SETUP COMPLETO  
**Próximo**: Task [5] - Baileys Service  
**Tempo**: 30 min  
**Data**: 15/05/2026

👉 **Quer que eu crie o arquivo `baileys.service.ts` agora?**
