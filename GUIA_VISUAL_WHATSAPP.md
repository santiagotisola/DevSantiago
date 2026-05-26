# 🎨 Guia Visual: Setup WhatsApp QR Code

## 📱 Fluxo Completo de Conexão

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CONDOSYNC WhatsApp Integration                    │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   Web Admin Login    │
                    │ atendimento@...com  │
                    │   Admin@2026        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Configurações     │
                    │  (Menu lateral)     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   WhatsApp Config   │
                    └──────────┬──────────┘
                               │
                               ▼
         ┌─────────────────────────────────────┐
         │  "Conectar WhatsApp" Button Click   │
         └──────────────┬──────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │  Backend gera novo QR Code           │
         │  GET /api/v1/whatsapp/qr            │
         │                                      │
         │  Response:                           │
         │  {                                   │
         │    "qr": "iVBORw0KG...",            │
         │    "status": "aguardando_qr"        │
         │  }                                   │
         └──────────────┬───────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │  QR Code aparece na tela             │
         │  ┌─────────────────────────────────┐ │
         │  │ ▀▄    ▄▀                        │ │
         │  │ █████████                       │ │
         │  │ █ ▀▄▀▄▀ █                      │ │
         │  │ █ ███ █                        │ │
         │  │ ▀▀▀▀▀▀▀▀                        │ │
         │  └─────────────────────────────────┘ │
         │                                      │
         │  Status: ⏳ Aguardando Scan        │
         └──────────────┬───────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │  Admin aponta camera do celular      │
         │  para o QR Code                      │
         │                                      │
         │  📱 (abrindo WhatsApp Web URL)       │
         └──────────────┬───────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │  WhatsApp captura a autenticação     │
         │  Baileys recebe conexão              │
         │                                      │
         │  Backend detecta:                    │
         │  Connection.open ✓                  │
         └──────────────┬───────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │  Status muda para "CONECTADO"        │
         │                                      │
         │  ✅ ✓✓ Conectado com sucesso!      │
         │                                      │
         │  Número: 5562987654321              │
         │  Sessão: ativa                      │
         │  Última verificação: Agora          │
         └──────────────┬───────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │  PRONTO PARA ENVIAR MENSAGENS!       │
         │                                      │
         │  Mobile App → WhatsApp Messaging     │
         │  Web Admin → Automações              │
         │  API REST → POST /send               │
         └──────────────────────────────────────┘
```

---

## 🎯 Passo a Passo: Onde Clicar

### **Passo 1: Acessar Configurações**

```
┌─ Web Admin (http://localhost) ─────┐
│                                     │
│  📱 CondoSync                       │
│  ├─ Dashboard                       │
│  ├─ Portaria                        │
│  ├─ Cadastros                       │
│  ├─ Financeiro                      │
│  ├─ Operacional                     │
│  ├─ Comunicação                     │
│  ├─ Relatórios                      │
│  └─ ⚙️ Configurações  ← CLIQUE AQUI│
│     ├─ Controle de Acesso          │
│     ├─ Dados do Condomínio         │
│     ├─ Documentos                  │
│     ├─ Convites                    │
│     ├─ Auditoria                   │
│     ├─ Painel do Síndico           │
│     └─ 📱 WhatsApp  ← E AQUI       │
│                                     │
└─────────────────────────────────────┘
```

### **Passo 2: Página de WhatsApp**

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Configuração de WhatsApp                          │
│  Conecte um número de WhatsApp para enviar         │
│  mensagens automatizadas                           │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Status da Conexão                             │ │
│  │                                               │ │
│  │ ❌ Desconectado                              │ │
│  │ Nenhum número vinculado no momento           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Escanear QR Code                              │ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │                                         │ │ │
│  │  │   [CONECTAR WHATSAPP] ← CLIQUE AQUI   │ │ │
│  │  │                                         │ │ │
│  │  │   Clique para gerar um novo QR Code    │ │ │
│  │  │                                         │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ℹ️  Informações Importantes                        │
│  ✓ Segurança: O número fica no servidor           │
│  ✓ Continuidade: Pode reconectar quando quiser   │
│  ✓ Permissões: Apenas admins conectam            │
│  ✓ Mensagens: Porteiros e admins podem enviar    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### **Passo 3: QR Code Gerado**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Status da Conexão                               │
│  ⏳ Aguardando Scan do QR Code                   │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ Escanear QR Code                           │ │
│  │                                            │ │
│  │  ┌──────────────────────────────────────┐ │ │
│  │  │                                      │ │ │
│  │  │    ▀▄    ▄▀                          │ │ │
│  │  │    █████████                         │ │ │
│  │  │    █ ▀▄▀▄▀ █                        │ │ │
│  │  │    █ ███ █                          │ │ │
│  │  │    ▀▀▀▀▀▀▀▀                          │ │ │
│  │  │                                      │ │ │
│  │  └──────────────────────────────────────┘ │ │
│  │                                            │ │
│  │  Como escanear:                            │ │
│  │  1. Abra WhatsApp no celular               │ │
│  │  2. Vá em Configurações > Dispositivos     │ │
│  │  3. Vincule um Novo Dispositivo            │ │
│  │  4. Aponte a câmera para o QR Code        │ │
│  │  5. Confirme no seu WhatsApp              │ │
│  │                                            │ │
│  │  ⏰ QR Code expira em alguns minutos       │ │
│  │  🔄 Se expirar, recarregue a página        │ │
│  │                                            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘
```

### **Passo 4: Conectado com Sucesso**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Status da Conexão                               │
│  ✅ Conectado                                    │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │                                            │ │
│  │    ✅ ✓✓ Conectado com sucesso!          │ │
│  │                                            │ │
│  │    Número: 5562987654321                  │ │
│  │    Status: Ativo                          │ │
│  │    Última verificação: Agora              │ │
│  │                                            │ │
│  │    Você pode enviar mensagens!            │ │
│  │                                            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  🎉 Próximas etapas:                             │
│                                                  │
│  1. Ir para Mobile App                          │
│     http://localhost:5174/whatsapp              │
│                                                  │
│  2. Enviar primeira mensagem                    │
│     Destinatário: 5562987654321                │
│     Mensagem: "Teste"                          │
│                                                  │
│  3. Criar automações                            │
│     Visitantes, Encomendas, Avisos...         │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 📊 Estados Possíveis

```
╔═══════════════════════════════════════════════════════════════╗
║               MÁQUINA DE ESTADOS DO WhatsApp                  ║
╚═══════════════════════════════════════════════════════════════╝

                    ┌──────────────────┐
                    │  DESCONECTADO    │◄──────┐
                    │  ❌ Offline      │       │
                    └────────┬─────────┘       │
                             │                 │
                    [Clicar "Conectar"]        │
                             │                 │
                             ▼                 │
                    ┌──────────────────┐       │
                    │ AGUARDANDO_QR    │       │
                    │ ⏳ Aguardando    │       │
                    └────────┬─────────┘       │
                             │                 │
                    [Escanear QR Code]         │
                             │                 │
                             ▼                 │
                    ┌──────────────────┐       │
                    │  CONECTADO       │       │
                    │  ✅ Online       │───────┘
                    │  Pronto para     │   [Desconectar ou
                    │  enviar mensagens│    erro de conexão]
                    └──────────────────┘


Estados em detalhes:

┌─ DESCONECTADO ────────────────────────┐
│ O que fazer: Clicar "Conectar"         │
│ Ações disponíveis: Nenhuma             │
│ Mensagens: Não conseguem enviar        │
└────────────────────────────────────────┘

┌─ AGUARDANDO_QR ───────────────────────┐
│ O que fazer: Escanear QR com celular   │
│ Ações disponíveis: Ver QR Code         │
│ Mensagens: Não conseguem enviar        │
│ Duração: ~2-3 minutos (expira)         │
└────────────────────────────────────────┘

┌─ CONECTADO ────────────────────────────┐
│ O que fazer: Enviar mensagens          │
│ Ações disponíveis: Todas!              │
│ Mensagens: Enviam normalmente          │
│ Duração: Até desconectar               │
└────────────────────────────────────────┘
```

---

## 🔄 Ciclo de Vida da Mensagem

```
Usuário digita e clica "Enviar"
         │
         ▼
┌────────────────────────────┐
│ Validação de Input         │
│ - Destinatário preenchido? │
│ - Mensagem não vazia?      │
│ - Número com +55?          │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Autenticação do Usuário    │
│ - Token JWT válido?        │
│ - Permissão de envio?      │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Verificar Status WhatsApp  │
│ - Status = "conectado"?    │
│ - Socket ativo?            │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Enviar via Baileys         │
│ - Conectar ao Socket.IO    │
│ - Enviar ao telefone       │
└────────┬───────────────────┘
         │
         ├─────────────┬──────────────┐
         ▼             ▼              ▼
      ✓ OK         ✗ Erro        ⏳ Timeout
      Enviado      Falha         Retry
         │             │              │
         ▼             ▼              ▼
    Status: "sent" Response: Error  Retentar
         │             │              │
         ▼             ▼              ▼
    Salvar BD      Log erro       Retry 3x
         │             │              │
         └─────────────┴──────────────┘
                │
                ▼
           Retornar ao Cliente
```

---

## 🎓 Formato de Número Correto

```
❌ ERRADO:
- 62987654321      (falta código país)
- +5562987654321   (tem +55 manualmente)
- (62) 98765-4321  (tem formatação)

✅ CORRETO:
- 5562987654321    (55 + DDD + número)

Estrutura:
┌─────────────────┬──────┬─────────────┐
│ Código País     │ DDD  │ Número      │
├─────────────────┼──────┼─────────────┤
│ 55              │ 62   │ 987654321   │
│ (Brasil)        │ (GO) │ (Celular)   │
└─────────────────┴──────┴─────────────┘

Resultado: 5562987654321

Onde encontrar números de teste:
- Seu WhatsApp: Configurações → Sobre → Número
- Colegas: Peça para compartilhar número
- Teste consigo mesmo: Use seu próprio número
```

---

## 🛠️ Troubleshooting Visual

```
┌─────────────────────────────────────────────────────┐
│  Problema: QR Code não aparece                      │
├─────────────────────────────────────────────────────┤
│  Causa Provável: Backend não iniciou WhatsApp      │
│                                                     │
│  Solução:                                           │
│  1. Verifique console do servidor:                 │
│     docker compose logs api                        │
│                                                     │
│  2. Procure por: "[WhatsApp] QR Code gerado"       │
│                                                     │
│  3. Se não aparecer, reinicie:                     │
│     docker compose down && docker compose up -d    │
│                                                     │
│  4. Recarregue página (F5)                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Problema: QR Code aparece mas não conecta         │
├─────────────────────────────────────────────────────┤
│  Causa Provável: Câmera não conseguiu ler código   │
│                                                     │
│  Solução:                                           │
│  1. Limpe a tela do celular                         │
│                                                     │
│  2. Tente em local mais iluminado                  │
│                                                     │
│  3. Clique "Conectar" novamente para novo QR       │
│                                                     │
│  4. Use WhatsApp Web (não app)                     │
│     web.whatsapp.com                              │
│                                                     │
│  5. QR expira em ~2 minutos, seja rápido!         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Problema: Conectou mas mensagem não envia         │
├─────────────────────────────────────────────────────┤
│  Causa Provável: Número não é contato no WhatsApp  │
│                                                     │
│  Solução:                                           │
│  1. Abra WhatsApp Web no PC                        │
│     web.whatsapp.com                              │
│                                                     │
│  2. Procure pelo número que vai testar             │
│     (ex: 62 98765-4321)                            │
│                                                     │
│  3. Se não existir, crie uma conversa              │
│     Clique em + → Novo Chat                        │
│                                                     │
│  4. Digite o número e envie uma mensagem           │
│                                                     │
│  5. Agora tente novamente via CondoSync            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Problema: "Desconectado" apareceu de repente     │
├─────────────────────────────────────────────────────┤
│  Causa Provável: Feche WhatsApp Web em outro lugar │
│                                                     │
│  Solução:                                           │
│  1. WhatsApp Web = apenas 1 sessão ativa           │
│                                                     │
│  2. Se abriu em outro navegador/PC, fecha lá       │
│                                                     │
│  3. Espere 2-3 segundos                            │
│                                                     │
│  4. Clique "Conectar" novamente                    │
└─────────────────────────────────────────────────────┘
```

---

## 📱 Mobile App → Enviar Mensagem

```
http://localhost:5174/whatsapp

┌─────────────────────────────────────┐
│  WhatsApp Messaging                 │
│  Integração com WhatsApp            │
│                                     │
│  Status: ✅ Conectado               │
├─────────────────────────────────────┤
│                                     │
│  Histórico:                         │
│  ┌─────────────────────────────────┐
│  │ Portaria - Casa 12      ✓✓      │
│  │ Visitante confirmado para 14:00 │
│  │                         14:30    │
│  ├─────────────────────────────────┤
│  │ Morador - Casa 05       ✓       │
│  │ Encomenda entregue      15:45    │
│  └─────────────────────────────────┘
│                                     │
├─────────────────────────────────────┤
│  Enviar Mensagem:                   │
│                                     │
│  Destinatário:                      │
│  [5562987654321_____________]      │
│                                     │
│  Mensagem:                          │
│  [Teste de conexão ______]         │
│                                     │
│  [    📤 ENVIAR    ]                │
│                                     │
└─────────────────────────────────────┘

Após clicar "Enviar":
  ✓ Mensagem entra na lista
  ✓ Status: ↻ (enviando)
  ✓ Depois: ✓ (enviado)
  ✓ Depois: ✓✓ (lido)
```

---

## 🎯 Checklist Visual

```
┌─ Configuração Inicial ────────────────────────┐
│ □ Acessar http://localhost/                   │
│ □ Ir para Configurações → WhatsApp           │
│ □ Clicar "Conectar WhatsApp"                 │
│ □ QR Code apareceu?                          │
│ □ Escanear com celular                       │
│ □ Status mudou para "Conectado"?             │
└───────────────────────────────────────────────┘

┌─ Teste de Envio ──────────────────────────────┐
│ □ Mobile App: http://localhost:5174/whatsapp │
│ □ Status mostra ✅ Conectado                 │
│ □ Digitar número: 5562987654321             │
│ □ Digitar mensagem: "Teste CondoSync"       │
│ □ Clicar "Enviar"                           │
│ □ Mensagem apareceu na lista?                │
│ □ Recebeu no WhatsApp?                       │
└───────────────────────────────────────────────┘

┌─ Configuração Avançada ───────────────────────┐
│ □ Criar automações de notificação            │
│ □ Testar com dados reais (visitantes)        │
│ □ Testar com dados reais (encomendas)        │
│ □ Validar permissões de roles                │
│ □ Treinar porteiros                          │
│ □ Documentar para usuários                   │
└───────────────────────────────────────────────┘
```

---

**Imagens visuais** podem ser adicionadas em:
- Screenshots do painel real
- GIF animado do QR Code sendo escaneado
- Vídeo tutorial de setup

Criado em: 20 de maio de 2026
