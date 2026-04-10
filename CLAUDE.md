# CLAUDE.md — Sistema de Gestão para Supermercados

## Visão Geral
Sistema completo de gestão para supermercados com PDV offline-first, painel administrativo web e app mobile. Dois desenvolvedores: Dev 1 (backend) e Dev 2 (frontend).

## Arquitetura

### Monorepo
```
/
├── apps/
│   ├── backend/     → NestJS (API REST + WebSocket)
│   ├── pdv/         → Electron + React (PDV desktop, offline-first)
│   ├── admin/       → React + Vite (painel administrativo web)
│   └── mobile/      → React Native + Expo (app interno)
├── packages/
│   └── shared/      → Types, interfaces e utils compartilhados
├── supabase/        → Schemas SQL, migrations, seed
└── docs/            → Documentação do projeto
```

### Stack Tecnológica
- **Backend:** Node.js + NestJS (TypeScript)
- **Banco central:** PostgreSQL via Supabase (auth + storage + realtime)
- **Banco local PDV:** SQLite via better-sqlite3 (offline-first)
- **Frontend admin:** React + Vite + Tailwind CSS + Zustand
- **Frontend PDV:** Electron + React + Vite
- **Mobile:** React Native + Expo
- **Pagamentos:** Pagar.me
- **Fiscal:** Focus NFe (NFC-e)
- **Tributário:** IBPT (alíquotas por NCM)

## Convenções de Código

### Geral
- TypeScript estrito em todo o projeto (`strict: true`)
- ESLint + Prettier configurados na raiz
- Nomes de variáveis e funções em inglês
- Comentários podem ser em português
- Commits em português, formato: `feat(módulo): descrição` (Conventional Commits)

### Backend (NestJS)
- Um módulo por domínio: `AuthModule`, `ProductsModule`, `SalesModule`, `StockModule`, `FiscalModule`, `CashierModule`, `ReportsModule`, `UsersModule`
- Cada módulo segue a estrutura: `controller`, `service`, `module`, `dto/`, `entities/`
- Validação com `class-validator` nos DTOs
- Documentação de endpoints com Swagger/OpenAPI
- Guards para autenticação (`JwtAuthGuard`) e autorização (`RolesGuard`)
- Perfis de acesso: `ADMIN`, `GERENTE`, `OPERADOR`

### Frontend Admin (React + Vite)
- Estrutura de pastas: `/pages`, `/components`, `/components/ui`, `/hooks`, `/services`, `/store`
- Estado global com Zustand (com persistência para auth)
- Chamadas HTTP via Axios com interceptors (token + redirect 401)
- Formulários com React Hook Form + Zod
- Componentes UI próprios com Tailwind: Button, Input, Select, Card, Modal, Badge, Spinner, Table
- React Router v6 para navegação

### Frontend PDV (Electron + React)
- Comunicação main ↔ renderer via IPC
- SQLite no processo main (better-sqlite3)
- Leitura de barras via input HID (sequência < 100ms + Enter)
- Balança Toledo via serialport (protocolo `P+NNNNN`)
- Configs persistidas com electron-store
- Sync a cada 30s: vendas pending → POST /sync → marcar synced

## Regras de Negócio Importantes

### PDV e Vendas
- UUID gerado no cliente para cada venda (evita duplicatas na sync)
- Venda offline salva no SQLite com status `pending`
- Ao sincronizar, backend ignora UUIDs já existentes
- Apenas um caixa aberto por operador por vez
- Fechamento de caixa gera resumo automático do turno

### Fiscal
- NFC-e emitida via Focus NFe após cada venda
- Cancelamento permitido até 30 min após emissão
- Certificado A1 (.pfx) armazenado encriptado no Supabase Storage
- SEMPRE testar em ambiente de homologação antes de produção
- Campos tributários (NCM, CFOP, CEST, alíquotas) devem ser revisados manualmente

### Estoque
- Toda venda confirmada gera movimentação tipo `venda` automaticamente
- Tipos de movimentação: `entrada`, `saida`, `ajuste`, `venda`
- Alertas diários (8h) para produtos com `stock_qty <= stock_min`

## Integrações Externas
| Serviço      | Uso                          | Variável de ambiente       |
|-------------|------------------------------|---------------------------|
| Supabase    | Banco, auth, storage         | `SUPABASE_URL`, `SUPABASE_KEY` |
| Focus NFe   | Emissão NFC-e                | `FOCUS_NFE_TOKEN`         |
| Pagar.me    | Pagamentos cartão/PIX        | `PAGARME_API_KEY`         |
| IBPT        | Alíquotas tributárias        | `IBPT_TOKEN`              |
| Sentry      | Monitoramento de erros       | `SENTRY_DSN`              |

## Plano de Fases
1. **Fundação** — Monorepo, configs, design system (1-2 sem)
2. **Auth** — JWT, perfis, ACL (1 sem)
3. **Produtos** — CRUD, IBPT, importação CSV (2 sem)
4. **PDV** — Vendas, offline, hardware (3 sem)
5. **Fiscal** — NFC-e, certificado A1 (2 sem)
6. **Estoque/Relatórios** — Movimentações, curva ABC, dashboard (2 sem)
7. **Testes/Deploy** — Jest, Railway, Sentry, build .exe (2 sem)

## Avisos para IA
- Não criar estruturas paralelas — sempre verificar arquivos existentes antes de gerar novos
- Respeitar os módulos NestJS já criados — não duplicar services ou controllers
- Usar os componentes UI do design system em `/apps/admin/src/components/ui`
- No PDV, toda operação com hardware (balança, impressora) fica no processo main do Electron
- Código fiscal é sensível — não confiar cegamente em código gerado, revisar campos tributários
