# Manual de Uso — Tela: Registrar Encomenda

> **Módulo:** Portaria → Encomendas  
> **Rota:** `/portaria/encomendas`  
> **Captura de tela:** `screens/portaria-encomendas-registro.png`  
> **Última revisão:** Março/2026

---

## Visão Geral

Esta tela foi estruturada seguindo rigorosamente:

- **Lei nº 11.442/2007** — Transporte Rodoviário de Cargas
- **Código Civil Brasileiro — Art. 754** — Responsabilidade por avaria
- **LGPD — Art. 7º, inciso IX** — Coleta de dados para segurança patrimonial

> **Preenchê-la corretamente garante que o condomínio não seja responsabilizado por danos ou extravios.**

---

## Guia de Preenchimento por Campo

### 1. Unidade Destinatária *(obrigatório)*

| | |
|---|---|
| **O que preencher** | Número do apartamento ou casa. Ex: `Apto 102`, `Casa 12` |
| **Significado legal** | Define quem é o **proprietário legal da mercadoria** a partir do momento em que o condomínio assina o recebimento. |

---

### 2. Dados da Transportadora

#### Transportadora
| | |
|---|---|
| **O que preencher** | Nome da empresa responsável pela entrega. Ex: `Correios`, `Loggi`, `Mercado Envios`, `Total Express` |
| **Finalidade** | Identifica a **origem logística** da entrega e o responsável legal pelo transporte. |

#### Placa do Veículo
| | |
|---|---|
| **O que preencher** | Placa do veículo utilizado na entrega. Ex: `ABC-1234` |
| **Base legal** | Vincula o veículo ao **RNTRC (ANTT)** — Registro Nacional de Transportadores Rodoviários de Cargas. Em caso de investigação de segurança, a placa permite rastrear o transportador credenciado. |

#### Código de Rastreio / NF
| | |
|---|---|
| **O que preencher** | Número que consta na etiqueta da embalagem ou na nota fiscal. Ex: `AA123456789BR` ou `NF-e 12345678` |
| **Finalidade** | Permite **rastrear a carga** no sistema da transportadora caso o morador alegue não ter recebido ou a mercadoria seja extraviada. |

---

### 3. Identificação do Entregador

> ⚠️ **Aviso na tela:** *"Coletado para segurança patrimonial (LGPD Art. 7º, IX)"*

#### Nome do Entregador
| | |
|---|---|
| **O que preencher** | Nome completo da pessoa que fez a entrega. Ex: `João da Silva` |

#### Documento (CPF ou RG)
| | |
|---|---|
| **O que preencher** | Apenas os números do CPF ou RG. Ex: `12345678901` |
| **Base legal** | A **LGPD Art. 7º, inciso IX** autoriza a coleta de dados pessoais quando necessária para atender interesses legítimos do controlador — aqui: **segurança patrimonial do condomínio**. Se houver um incidente dentro do prédio após a entrega, este dado identifica o responsável físico. |
| **Retenção** | O dado deve ser armazenado pelo prazo mínimo de **5 anos** (prescrição civil, Art. 206 CC), podendo ser solicitado por autoridade policial ou judicial. |

---

### 4. Armazenamento e Observações

#### Local de Armazenamento
| | |
|---|---|
| **O que preencher** | Localização física onde o pacote será guardado na portaria/almoxarifado. Ex: `Prateleira B-05`, `Armário 3` |
| **Finalidade** | Facilita a **localização rápida** quando o morador vier retirar, reduzindo tempo de atendimento e risco de extravio interno. |

#### Remetente
| | |
|---|---|
| **O que preencher** | Nome de quem enviou a encomenda. Ex: `Amazon`, `Shopee`, `Maria Oliveira` |
| **Finalidade** | Ajuda o morador a **identificar a encomenda** sem precisar abrir a embalagem, especialmente útil quando há múltiplos pacotes aguardando retirada. |

---

### 5. Embalagem com Avaria Visível *(Checkbox)*

> ⚠️ **Marcar quando:** A caixa estiver amassada, rasgada, molhada ou com o lacre rompido.

| | |
|---|---|
| **Base legal** | **Art. 754 do Código Civil** — O transportador é responsável pela perda ou avaria da mercadoria, salvo prova de que o dano ocorreu por caso fortuito, força maior ou culpa do remetente/destinatário. |
| **Efeito jurídico** | Ao marcar este campo, o condomínio **registra formalmente** que a avaria preexistia à entrada no edifício, **eximindo-se de responsabilidade civil** caso o produto interno esteja danificado. |
| **Boas práticas** | Além de marcar o checkbox, descreva nas **Observações** o tipo de dano (ex: *"caixa amassada no canto superior direito"*). |

#### Observações
| | |
|---|---|
| **O que preencher** | Detalhes adicionais relevantes. Ex: `"Caixa pesada, aprox. 10kg"`, `"Embalagem molhada no canto direito"`, `"Entregador informou que houve queda no caminhão"` |

---

## Fluxo de Trabalho Recomendado

```
Entregador chega na portaria
         │
         ▼
Verificar placa do veículo + documento do entregador
         │
         ▼
Inspecionar visualmente a embalagem
         │
    ┌────┴────┐
    │ Avaria? │
    └────┬────┘
   Sim   │   Não
    │         │
Marcar   Prosseguir
checkbox  normal
    │         │
    └────┬────┘
         ▼
Registrar no sistema:
  - Unidade destinatária
  - Transportadora + placa + rastreio
  - Nome e documento do entregador
  - Local de armazenamento
  - Remetente
  - Observações (se houver)
         │
         ▼
Guardar na prateleira indicada
         │
         ▼
Sistema notifica o morador automaticamente
```

---

## Dicas de Ouro

> **Avaria registrada?** Além do checkbox e das observações textuais, **tire uma foto** com o celular da portaria **antes** de o entregador ir embora. A foto pode ser anexada ao registro.

> **Entregador sem documento?** Recuse o recebimento ou registre a ausência nas observações. O condomínio assume co-responsabilidade ao aceitar encomenda sem identificação do portador.

> **Morador ausente?** O sistema envia notificação automática ao morador. Não é necessário ligar.

> **Encomenda não retirada após 15 dias?** Recomenda-se acionar o morador novamente por escrito (pelo módulo de Comunicados) para fins de registro formal.

---

## Campos e Responsabilidade por Perfil

| Campo | Perfil que preenche | Obrigatório |
|-------|---------------------|-------------|
| Unidade destinatária | Porteiro | ✅ Sim |
| Transportadora | Porteiro | Não |
| Placa do veículo | Porteiro | Não (recomendado) |
| Código de rastreio | Porteiro | Não (recomendado) |
| Nome do entregador | Porteiro | Não (recomendado) |
| Documento do entregador | Porteiro | Não (recomendado forte) |
| Local de armazenamento | Porteiro | Não |
| Remetente | Porteiro | Não |
| Avaria visível | Porteiro | Quando houver avaria |
| Observações | Porteiro | Quando houver informação relevante |

---

## Referências Legais

| Norma | Dispositivo | Aplicação |
|-------|-------------|-----------|
| Lei nº 11.442/2007 | Art. 3º, 13º | Cadastro do transportador e vínculo ao RNTRC/ANTT |
| Código Civil | Art. 754 | Responsabilidade do transportador por avaria |
| Código Civil | Art. 206 | Prazo prescricional de 5 anos para guarda de registros |
| LGPD (Lei 13.709/2018) | Art. 7º, IX | Base legal para coleta do documento do entregador |
| LGPD (Lei 13.709/2018) | Art. 46 | Obrigação de guardar os dados com segurança |

---

*Documento gerado para o sistema CondoSync — Módulo Portaria.*
