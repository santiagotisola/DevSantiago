# CondoSync — Manual do Usuário

> Versão de 2026-05-13 · https://condosync.app

Bem-vindo(a) ao **CondoSync**, o sistema de gestão do seu condomínio. Este manual mostra, passo a passo, o que você pode fazer dentro do sistema de acordo com o seu perfil.

---

## Sumário

1. [Primeiros passos](#1-primeiros-passos)
2. [Login, senha e segurança da conta](#2-login-senha-e-segurança-da-conta)
3. [Conhecendo a tela inicial](#3-conhecendo-a-tela-inicial)
4. [Perfis de acesso](#4-perfis-de-acesso)
5. [Para o **Morador**](#5-para-o-morador)
6. [Para a **Portaria**](#6-para-a-portaria)
7. [Para o **Síndico / Administrador**](#7-para-o-síndico--administrador)
8. [Notificações](#8-notificações)
9. [Aplicativo no celular (PWA)](#9-aplicativo-no-celular-pwa)
10. [Perguntas frequentes](#10-perguntas-frequentes)
11. [Suporte](#11-suporte)

---

## 1. Primeiros passos

### O que é o CondoSync?

É a plataforma online onde você acompanha tudo do seu condomínio em um só lugar: visitantes, encomendas, boletos, avisos, reservas de área comum, assembleias, ocorrências e muito mais.

### Como acessar

1. Abra o navegador e vá em **https://condosync.app**.
2. Você receberá um **convite por e-mail** do seu condomínio com o link de cadastro.
3. Defina uma senha forte e pronto: está dentro.

> **Não recebeu o convite?** Verifique a caixa de spam ou peça ao síndico/administrador para reenviar.

---

## 2. Login, senha e segurança da conta

### Entrar

- Informe **e-mail** e **senha** na tela de login.
- Marque "Lembrar-me" se for um dispositivo de uso pessoal.

### Esqueci minha senha

1. Clique em **"Esqueci minha senha"** na tela de login.
2. Você receberá um e-mail com um link para redefinir.
3. Crie uma nova senha (mínimo 8 caracteres, com letras e números).

### Alterar senha

Acesse **Perfil → Segurança → Alterar senha**.

### Ativar verificação em duas etapas (2FA)

Recomendado para síndicos, administradores e portaria.

1. Vá em **Perfil → Segurança → Verificação em duas etapas**.
2. Escaneie o QR Code com um app autenticador (Google Authenticator, Authy, Microsoft Authenticator).
3. Digite o código de 6 dígitos para confirmar.
4. **Guarde os códigos de recuperação** num lugar seguro.

### Entrar com biometria (Passkeys)

Em celulares e notebooks compatíveis você pode cadastrar uma **passkey** (digital ou reconhecimento facial) em **Perfil → Segurança → Chaves de acesso**.

### Sessões ativas

Em **Perfil → Sessões** você vê todos os dispositivos conectados e pode **encerrar** o acesso de qualquer um deles.

---

## 3. Conhecendo a tela inicial

Ao entrar você verá o **Painel (Dashboard)** com:

- **Avisos recentes** do condomínio.
- **Pendências** (boletos a vencer, encomendas para retirar, visitantes aguardando).
- **Atalhos** para as áreas mais usadas pelo seu perfil.
- **Menu lateral** com todos os módulos disponíveis.

Use o **ícone do sino** no topo para ver suas notificações.

Use o **avatar no canto** para acessar seu perfil, trocar de condomínio (se você mora em mais de um) e sair.

---

## 4. Perfis de acesso

O que cada um vê depende do papel atribuído:

| Perfil | O que faz |
|--------|-----------|
| 🏠 **Morador (Resident)** | Acompanha boletos, reserva áreas, autoriza visitantes, recebe avisos, abre ocorrências. |
| 🛎️ **Portaria (Doorman)** | Registra visitantes, encomendas, veículos e libera acessos. |
| 👷 **Funcionário (Employee)** | Recebe ordens de serviço, registra manutenções. |
| 🛡️ **Síndico / Subsíndico** | Gestão completa do condomínio: financeiro, comunicação, assembleias, contratos. |
| ⚙️ **Administrador do Condomínio** | Mesmas permissões do síndico + configurações do condomínio e usuários. |
| 🌐 **Super Admin** | Gerencia toda a plataforma e múltiplos condomínios. |

---

## 5. Para o Morador

### 5.1 Boletos e cobranças

**Menu: Financeiro → Minhas cobranças**

- Veja boletos abertos, pagos e vencidos.
- Clique em um boleto para:
  - **Copiar o código PIX** (pagamento instantâneo).
  - **Baixar o boleto em PDF**.
  - Ver o **comprovante** depois de pago.
- Após pagar, a baixa é **automática** (via integração com o banco/ASAAS) — em geral em minutos.

### 5.2 Visitantes

**Menu: Portaria → Visitantes**

Pré-autorize quem vai te visitar para agilizar a entrada:

1. Clique em **"+ Novo visitante"**.
2. Preencha nome, documento, data/hora prevista.
3. (Opcional) **Gerar QR Code** — envie pelo WhatsApp; na chegada, a portaria só escaneia.
4. Para visitas recorrentes (diarista, professor particular), use **"Recorrência"** definindo os dias da semana.

### 5.3 Encomendas

**Menu: Portaria → Encomendas**

- Você é avisado automaticamente quando uma encomenda chega.
- Marque como **"Retirada"** ao pegar (ou a portaria registra no ato da entrega).
- Histórico completo fica salvo.

### 5.4 Veículos

**Menu: Portaria → Veículos**

Cadastre placas dos seus carros e dos visitantes frequentes.

### 5.5 Reserva de áreas comuns

**Menu: Áreas comuns**

1. Escolha o espaço (salão, churrasqueira, quadra, piscina…).
2. Veja o calendário com horários disponíveis.
3. Clique no horário desejado → **Reservar**.
4. Se houver taxa, será gerada uma **cobrança automática**.
5. Você pode **cancelar** até a data limite definida pelo condomínio.

### 5.6 Avisos e comunicados

**Menu: Comunicação → Avisos**

Veja avisos publicados pelo síndico/administração. Avisos importantes aparecem destacados no painel inicial.

### 5.7 Ocorrências

**Menu: Comunicação → Ocorrências**

Registrou um problema (barulho, vazamento, dano)? Abra uma ocorrência:

1. Clique em **"+ Nova ocorrência"**.
2. Escolha a categoria.
3. Descreva e anexe fotos.
4. Acompanhe o status (Aberta → Em análise → Resolvida).

### 5.8 Chamados (tickets)

**Menu: Chamados**

Solicitações administrativas (2ª via de boleto, atualização de cadastro, dúvidas) com troca de mensagens.

### 5.9 Assembleias

**Menu: Assembleias**

- Veja convocações e pautas.
- Confirme presença.
- **Vote online** nos itens em pauta dentro do prazo.
- Baixe a ata após o encerramento.

### 5.10 Enquetes

Quando o síndico publica uma enquete, ela aparece no painel. Basta votar.

### 5.11 Documentos

**Menu: Documentos**

Convenção, regimento interno, atas, balancetes — disponíveis para download.

### 5.12 Pets

**Menu: Pets** — cadastre seu animal (nome, espécie, raça, foto e vacinação) conforme exigido pelo condomínio.

### 5.13 Galeria

**Menu: Galeria** — fotos de eventos e áreas do condomínio.

### 5.14 Achados e perdidos

**Menu: Achados e perdidos** — itens encontrados ficam listados aqui com foto.

### 5.15 Marketplace

**Menu: Marketplace** — ofertas e descontos negociados por parceiros do condomínio.

### 5.16 Botão de pânico 🚨

Disponível no menu e no celular. Use **apenas em emergências reais**: aciona imediatamente a portaria e os responsáveis cadastrados.

### 5.17 Assistente IA

Ícone de chat no canto inferior. Pergunte coisas como:

- *"Quando vence meu próximo boleto?"*
- *"Como reservo o salão de festas?"*
- *"Qual o telefone da portaria?"*

---

## 6. Para a Portaria

### 6.1 Painel de portaria

**Menu: Minha portaria**

Tela única com:

- Visitantes aguardando liberação.
- Encomendas a entregar.
- Veículos cadastrados.
- Botão de pânico.

### 6.2 Registrar visitante

1. **Portaria → Visitantes → "+ Novo"**.
2. Procure pelo morador/unidade.
3. Preencha dados do visitante (ou escaneie o QR Code recebido pelo morador).
4. Clique em **Liberar entrada** — o morador é notificado em tempo real.
5. Ao sair, marque **"Saída registrada"**.

### 6.3 Receber encomenda

1. **Portaria → Encomendas → "+ Nova"**.
2. Identifique o destinatário (unidade ou morador).
3. Adicione descrição/transportadora e (opcional) foto.
4. Salve — o morador é **notificado na hora** (push, e-mail e dentro do app).
5. Na entrega, marque **"Retirada"** com nome de quem retirou.

### 6.4 Veículos

Registre placas, controle entrada/saída e veja log de acessos.

### 6.5 Painel digital (Digital Signage)

Quando o condomínio usa **TV na portaria/elevador**, conteúdos publicados em **Painel digital** aparecem automaticamente.

---

## 7. Para o Síndico / Administrador

### 7.1 Dashboard gerencial

Visão consolidada: inadimplência, ocorrências abertas, manutenções programadas, próximas reservas, assembleias.

### 7.2 Financeiro

**Menu: Financeiro**

- **Contas** (caixa, banco).
- **Categorias** de receita/despesa.
- **Transações** — lance manualmente ou importe.
- **Cobranças** — gere boletos/PIX em massa via **ASAAS**.
- **Regras de cobrança** — automatize a emissão mensal por unidade.
- **Multas** — aplique e cobre infrações.
- **Relatórios**: balancete, fluxo de caixa, inadimplência.
- **Webhooks ASAAS** já configurados garantem **baixa automática**.

### 7.3 Unidades & Moradores

**Menu: Unidades** — cadastre blocos/torres, unidades, vincule moradores e dependentes.

**Menu: Moradores** — visão consolidada.

### 7.4 Funcionários

**Menu: Funcionários** — cadastros, escalas, contratos.

### 7.5 Prestadores de serviço

Cadastre prestadores recorrentes com contrato, vigência e alertas de vencimento.

### 7.6 Contratos do condomínio

**Menu: Contratos** — armazene contratos com data de validade e receba alertas antes do vencimento.

### 7.7 Manutenção & OS

**Menu: Manutenção**

- **Ordens de serviço** com checklist.
- **Manutenção programada** (mensal, trimestral, anual) — o sistema cria a OS automaticamente.
- Alertas antes do vencimento.

### 7.8 Reformas (Obras)

**Menu: Obras** — controle de pedidos de reforma das unidades, com prestadores, prazos e documentação.

### 7.9 Estoque

**Menu: Estoque** — itens consumíveis (limpeza, manutenção), movimentações de entrada/saída e alertas de estoque mínimo.

### 7.10 Áreas comuns

Cadastre espaços, regras (capacidade, horários, taxa, antecedência mínima/máxima, regras de cancelamento) e períodos bloqueados.

### 7.11 Assembleias

**Menu: Assembleias**

1. Crie a assembleia com data e local.
2. Defina **pautas votáveis**.
3. Configure **quórum** mínimo.
4. Envie convocação (vai por e-mail e push).
5. Acompanhe presenças e votos **em tempo real** no dia.
6. Finalize gerando a ata.

### 7.12 Comunicação

- **Avisos** — gerais ou segmentados por bloco/unidade. Push imediato.
- **Enquetes** — coleta de opinião.
- **Ocorrências** — fluxo de atendimento.

### 7.13 Documentos

Publique convenção, regimento, atas, balancetes — com controle de quem pode ver.

### 7.14 Galeria

Suba fotos de eventos e do condomínio.

### 7.15 Achados e perdidos

Cadastre itens encontrados.

### 7.16 Marketplace

Cadastre parceiros e ofertas exclusivas para os moradores.

### 7.17 Painel digital

Crie playlists de imagens e avisos para as TVs do condomínio.

### 7.18 Usuários e permissões

**Menu: Configurações → Usuários**

- Convide moradores, funcionários e portaria.
- Defina papéis.
- Configure **permissões granulares** por usuário.
- Veja **logs de auditoria** (quem fez o quê, quando).

### 7.19 Relatórios

**Menu: Relatórios** — financeiros, ocupação, ocorrências, manutenções etc., exportáveis em PDF/CSV.

### 7.20 LGPD

**Menu: Configurações → LGPD** — atenda solicitações de acesso, exportação e exclusão de dados pessoais.

---

## 8. Notificações

Você é avisado por **três canais**:

| Canal | Quando |
|-------|--------|
| 🔔 **Dentro do app** (sino) | Sempre. |
| 📱 **Push** (celular) | Quando o app PWA está instalado e push autorizado. |
| ✉️ **E-mail** | Eventos importantes (boleto novo, convocação, encomenda etc.). |

### Configurar preferências

**Perfil → Notificações** — escolha exatamente quais eventos quer receber em cada canal (encomendas, boletos, avisos, ocorrências, assembleias…).

---

## 9. Aplicativo no celular (PWA)

O CondoSync funciona como **aplicativo no celular** sem precisar baixar da loja:

### Android (Chrome)

1. Abra **https://condosync.app** no Chrome.
2. Toque no menu **⋮ → "Adicionar à tela inicial"**.
3. Pronto: o ícone fica como um app normal.

### iPhone (Safari)

1. Abra **https://condosync.app** no Safari.
2. Toque no botão **Compartilhar (□↑)**.
3. Escolha **"Adicionar à Tela de Início"**.

### Por que vale a pena

- Notificações push.
- Funciona offline para telas já visitadas.
- Atalho rápido.
- Ocupa pouquíssimo espaço.

---

## 10. Perguntas frequentes

**Posso usar o mesmo cadastro em mais de um condomínio?**
Sim. Se você for cadastrado em mais de um, troque pelo seletor no canto superior.

**Paguei o boleto e ele continua aberto. E agora?**
A baixa automática costuma levar alguns minutos. Se passar de 1 dia útil, abra um **chamado** anexando o comprovante.

**O QR Code do visitante venceu, e agora?**
Gere um novo em **Portaria → Visitantes → editar**.

**Posso cancelar uma reserva?**
Sim, dentro do prazo definido pelo condomínio (visível na tela da reserva).

**Esqueci minha senha e meu e-mail está desatualizado.**
Peça ao síndico/administrador para **atualizar seu e-mail** no cadastro e reenviar o link.

**Como funciona o botão de pânico?**
Aciona imediatamente a portaria + responsáveis cadastrados, com sua localização (se autorizada). Use só em emergência.

**Meus dados estão seguros?**
Sim: senhas criptografadas, opção de **2FA**, **passkeys**, conexão **HTTPS** com Cloudflare, conformidade LGPD e logs de auditoria.

---

## 11. Suporte

- **Suporte do seu condomínio:** abra um **chamado** dentro do sistema (Menu → Chamados).
- **Site:** https://condosync.app
- **Em caso de incidente urgente:** contate a portaria pelos meios tradicionais — o sistema é um apoio, não substitui o atendimento físico em emergências.

---

> Este manual evolui junto com o sistema. Sempre que houver uma novidade importante, ela será publicada em **Avisos** no seu painel.
