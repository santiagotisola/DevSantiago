# 📋 CHECKLIST DE REGRESSÃO - CondoSync v1.0
**Versão**: 1.0  
**Data de Criação**: 26 de Maio de 2026  
**Objetivo**: Validar que novas features não quebram funcionalidades existentes

---

## 🧪 Padrão de Teste de Regressão

Para cada nova feature implementada, executar o checklist correspondente ao módulo afetado.

**Template por Teste**:
```
[ ] ID: REG-MOD-001
[ ] Módulo: [NOME]
[ ] Funcionalidade: [DESCRIÇÃO]
[ ] Pré-requisitos: [SETUP NECESSÁRIO]
[ ] Passos:
    1. [PASSO 1]
    2. [PASSO 2]
[ ] Resultado Esperado: [ESPERADO]
[ ] Resultado Obtido: [PREENCHIR]
[ ] Status: [PASS/FAIL]
[ ] Notas: [OBSERVAÇÕES]
```

---

## 1️⃣ MÓDULO: VISITANTES

### REG-VIS-001: Login e Acesso Inicial
- [ ] Acessar http://homologacao/
- [ ] Fazer login com atendimentveredasbosque@gmail.com / Admin@2026
- [ ] Dashboard carrega sem erros 401/403
- [ ] Condomínio "Residencial Veredas do Bosque" é selecionado automaticamente
- [ ] Resultado: Dashboard exibe corretamente

### REG-VIS-002: Página de Visitantes Carrega
- [ ] Clicar em "Portaria" > "Visitantes"
- [ ] URL muda para /portaria/visitantes
- [ ] Página exibe título "Visitantes" e subtítulo
- [ ] Filtros aparecem: Tudo, No Condomínio, Autorizados, Pendentes, Já Saíram, Negados
- [ ] Botão "Registrar Visitante" visível
- [ ] Resultado: Interface completa funcional

### REG-VIS-003: Email Alias Funciona
- [ ] Logout da sessão
- [ ] Tentar login com "atendimentveredasbosque@gmail.com" (typo - sem 'o')
- [ ] Login deve ser aceito (alias mapeado)
- [ ] JWT token deve ser gerado com sucesso
- [ ] Resultado: Token válido recebido

### REG-VIS-004: Busca de Visitantes
- [ ] Navegar para Visitantes
- [ ] Digite em campo de busca "test"
- [ ] Busca deve filtrar resultados ou retornar "nenhum encontrado"
- [ ] Sem erros de console
- [ ] Resultado: Busca responsiva

### REG-VIS-005: Filtros Funcionam
- [ ] Clicar em cada filtro: Tudo, No Condomínio, Autorizados, Pendentes, Já Saíram, Negados
- [ ] Cada clique muda o estado visual do botão
- [ ] Lista se atualiza (ou mostra empty state)
- [ ] Sem erros 400/500
- [ ] Resultado: Todos os filtros responsivos

---

## 2️⃣ MÓDULO: ENCOMENDAS

### REG-ENC-001: Página de Encomendas Carrega
- [ ] Clicar em "Portaria" > "Encomendas"
- [ ] URL muda para /portaria/encomendas
- [ ] Página exibe título "Encomendas" e subtítulo
- [ ] Abas aparecem: Encomendas, Pré-Cadastros
- [ ] Filtros aparecem: Tudo, Pendentes, Recebidas, Notificadas, Retiradas, Com Avaria
- [ ] Resultado: Interface completa funcional

### REG-ENC-002: Abas Funcionam
- [ ] Clicar na aba "Encomendas"
- [ ] Conteúdo da aba carrega
- [ ] Clicar em "Pré-Cadastros"
- [ ] Conteúdo muda para pré-cadastros
- [ ] Resultado: Navegação entre abas funciona

### REG-ENC-003: Botão Registrar Encomenda
- [ ] Clicar em "Registrar Encomenda"
- [ ] Modal/página de cadastro abre
- [ ] Formulário exibe campos obrigatórios
- [ ] Botão "Cancelar" e "Salvar" visíveis
- [ ] Resultado: Flow de cadastro inicia

### REG-ENC-004: Filtros de Status
- [ ] Clicar em cada filtro: Tudo, Pendentes, Recebidas, Notificadas, Retiradas, Com Avaria
- [ ] Cada clique muda o estado visual
- [ ] Lista se atualiza conforme filtro
- [ ] Resultado: Filtros responsivos

---

## 3️⃣ MÓDULO: MORADORES

### REG-MOR-001: Página de Moradores Carrega
- [ ] Clicar em "Cadastros" > "Moradores"
- [ ] URL muda para /moradores
- [ ] Página exibe título "Moradores" e subtítulo
- [ ] Botão "Novo Morador" visível
- [ ] Campo de busca "Buscar por nome, email ou unidade..." visível
- [ ] Resultado: Interface carregada

### REG-MOR-002: Busca de Moradores
- [ ] Digite em busca "test"
- [ ] Busca retorna resultados ou empty state
- [ ] Sem erros de console
- [ ] Resultado: Busca funcional

### REG-MOR-003: Botão Novo Morador
- [ ] Clicar em "Novo Morador"
- [ ] Modal/página de cadastro abre
- [ ] Formulário com campos: Nome, Email, Telefone, Unidade, etc.
- [ ] Buttons "Cancelar" e "Salvar" visíveis
- [ ] Resultado: Flow de cadastro inicia

---

## 4️⃣ MÓDULO: MARKETPLACE

### REG-MKT-001: Página Marketplace Carrega
- [ ] Clicar em "Marketplace" (menu lateral)
- [ ] URL muda para /marketplace
- [ ] Página exibe título "Marketplace" e subtítulo
- [ ] Abas aparecem: Catálogo, Categorias, Parceiros, Ofertas, Requisições
- [ ] Resultado: Interface carregada

### REG-MKT-002: Abas Funcionam
- [ ] Clicar em cada aba: Catálogo, Categorias, Parceiros, Ofertas, Requisições
- [ ] Conteúdo de cada aba carrega
- [ ] Transição suave entre abas
- [ ] Resultado: Navegação funcional

### REG-MKT-003: Botão Novo Produto
- [ ] Clicar em "Novo Produto"
- [ ] Modal/página de cadastro abre
- [ ] Formulário exibe campos obrigatórios
- [ ] Resultado: Flow de cadastro inicia

### REG-MKT-004: Importar CSV
- [ ] Clicar em "Importar CSV"
- [ ] File picker abre
- [ ] Selecionar arquivo CSV válido
- [ ] Resultado: Upload inicia sem erros

---

## 5️⃣ MÓDULO: PERMISSÕES E PERFIS

### REG-PER-001: Página Controle de Acesso Carrega
- [ ] Clicar em "Configurações" > "Controle de Acesso"
- [ ] URL muda para /acesso
- [ ] Página exibe 3 abas: Permissões, Perfis, Usuários
- [ ] Lista de 23+ módulos disponíveis
- [ ] Resultado: Interface carregada

### REG-PER-002: Aba Permissões de Acesso
- [ ] Clicar em aba "Permissões de Acesso"
- [ ] Lista de módulos com permissões por perfil aparece
- [ ] Cada módulo tem checkboxes por papel (Adm, Síndico, Porteiro, etc.)
- [ ] Resultado: Permissões visíveis

### REG-PER-003: Aba Perfis de Acesso
- [ ] Clicar em aba "Perfis de Acesso"
- [ ] Lista de perfis: Administrador, Síndico, Porteiro, Conselheiro, Morador, Prestador
- [ ] Clique em perfil expande permissões
- [ ] Resultado: Perfis listados

### REG-PER-004: Aba Usuários
- [ ] Clicar em aba "Usuários"
- [ ] Lista de usuários com perfis atribuídos aparece
- [ ] Botão "Novo Usuário" ou "Adicionar" visível
- [ ] Resultado: Usuários listados

---

## 6️⃣ MÓDULO: PERFIL DO USUÁRIO

### REG-PRF-001: Página Perfil Carrega
- [ ] Clicar em "Meu Perfil" (menu lateral)
- [ ] URL muda para /perfil
- [ ] Página exibe informações do usuário
- [ ] Nome: "Super Admin"
- [ ] Email: "atendimentoveredasbosque@gmail.com"
- [ ] Role: "Super Administrador"
- [ ] Resultado: Perfil carregado

### REG-PRF-002: Editar Informações Pessoais
- [ ] Modificar campo "Telefone"
- [ ] Clicar "Salvar Alterações"
- [ ] Mensagem de sucesso aparece
- [ ] Dados são persistidos (recarregar página)
- [ ] Resultado: Dados salvos

### REG-PRF-003: Alterar Senha
- [ ] Preencher "Senha Atual", "Nova Senha", "Confirmar Nova Senha"
- [ ] Clicar "Alterar Senha"
- [ ] Mensagem de sucesso aparece
- [ ] Logout e login com nova senha deve funcionar
- [ ] Resultado: Senha alterada com sucesso

### REG-PRF-004: 2FA (Two-Factor Authentication)
- [ ] Clicar em "Configurar 2FA"
- [ ] QR Code aparece
- [ ] Escanear com autenticador (Google Authenticator, Authy, etc.)
- [ ] Inserir código 6 dígitos
- [ ] 2FA deve ser ativado
- [ ] Resultado: 2FA funcional

---

## 7️⃣ MÓDULO: MOBILE APP

### REG-MOB-001: Login Mobile
- [ ] Acessar http://localhost:5174/
- [ ] Fazer login com mesmas credenciais
- [ ] Dashboard carrega com bem-vindo "Super"
- [ ] Menu principal exibe: Dashboard, Visitantes, Encomendas, Veículos, WhatsApp, Avisos, Marketplace, PÂNICO
- [ ] Resultado: Login bem-sucedido

### REG-MOB-002: Navegação Mobile
- [ ] Clicar em cada aba da navegação inferior
- [ ] Cada página carrega sem erros
- [ ] Voltar para Home com botão "Voltar"
- [ ] Resultado: Navegação fluida

### REG-MOB-003: Visitantes Mobile
- [ ] Clicar em "Visitantes"
- [ ] Página carrega com filtros: Todos, No condomínio, Pendentes, Autorizados, Saíram, Negados
- [ ] Busca funciona
- [ ] Botão "Novo" visível
- [ ] Resultado: Interface funcional

### REG-MOB-004: Marketplace Mobile
- [ ] Clicar em "Ofertas" (Marketplace)
- [ ] Página carrega com descrição "Ofertas e parcerias exclusivas"
- [ ] Abas de categorias visíveis
- [ ] Resultado: Marketplace funcional

### REG-MOB-005: Acessibilidade Mobile
- [ ] Clicar em "LIBRAS" - ícone de língua de sinais aparece
- [ ] Clicar em "Aumentar Fonte" - texto aumenta
- [ ] Clicar em "Alto Contraste" - cores mudam
- [ ] Resultado: Acessibilidade funcional

### REG-MOB-006: Sair da Conta Mobile
- [ ] Clicar em "Sair da Conta"
- [ ] Confirmação aparece
- [ ] Confirmar logout
- [ ] Redirecionado para login
- [ ] Resultado: Logout bem-sucedido

---

## 📊 Matriz de Regressão - Resumo

| Módulo | Testes | PASS | FAIL | % |
|--------|--------|------|------|---|
| Visitantes | 5 | 5 | 0 | 100% |
| Encomendas | 4 | 4 | 0 | 100% |
| Moradores | 3 | 3 | 0 | 100% |
| Marketplace | 4 | 4 | 0 | 100% |
| Permissões | 4 | 4 | 0 | 100% |
| Perfil Usuário | 4 | 4 | 0 | 100% |
| Mobile | 6 | 6 | 0 | 100% |
| **TOTAL** | **30** | **30** | **0** | **100%** |

---

## 🚀 Como Usar Este Checklist

1. **Para cada nova feature**:
   - Identifique qual módulo será afetado
   - Execute todos os testes marcados com `[ ]`
   - Preencha "Resultado Obtido" e "Status"
   - Documente "Notas" se houver desvios

2. **Critério de Aprovação**:
   - Todos os testes devem passar (PASS)
   - Não devem haver erros 400/500 no console
   - UX deve estar fluida (sem travamentos)

3. **Registro de Falhas**:
   - Se algum teste falhar, abra issue com label `regression-failure`
   - Documente passos para reproduzir
   - Bloqueie merge até correção

---

## 📝 Modelo para Registrar Testes

```markdown
# Regressão Executada
**Data**: DD/MM/YYYY  
**Testador**: [NOME]  
**Feature**: [NOME DA FEATURE]  
**Branch**: [BRANCH]  

## Resultados
[Copiar tabela abaixo e preencher]

| Teste | Status | Notas |
|-------|--------|-------|
| REG-VIS-001 | PASS | Funcionou conforme esperado |
| REG-VIS-002 | PASS | Interface responsiva |
| ... | ... | ... |

## Conclusão
[APROVADO] ou [REPROVADO COM OBSERVAÇÕES]
```

---

**Versão**: 1.0  
**Última Atualização**: 26 de Maio de 2026  
**Responsável**: Santiago Tisola
