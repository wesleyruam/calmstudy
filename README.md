# CalmBook

> Sua biblioteca digital pessoal — um ambiente de leitura, estudo e organização.
> A ambição: **Notion + Kindle + Apple Books + Obsidian**, focado em consumir conhecimento, conectar ideias e acompanhar a evolução do aprendizado.

CalmBook não é "mais um visualizador de PDF". É um espaço onde você importa qualquer
documento (PDF, EPUB, MOBI, CBZ, ...), organiza em prateleiras e coleções, lê com um
leitor altamente personalizável, anota, destaca, e usa IA para estudar — tudo
sincronizado.

## Filosofia

Calma · foco · silêncio · conforto · produtividade · organização.

Nada de interfaces cheias de botões. Tudo respira. Muito espaço em branco, animações
suaves, vidro fosco, sombras discretas.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack escolhida (com justificativas), arquitetura de alto nível, leitor, pipeline de documentos, IA, busca, segurança |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Modelo de dados refinado (entidades, relações, decisões de schema) |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Construção em fases: do MVP enxuto até a visão completa |

## Status

🏗 **Fase 1 em andamento — pipeline de upload funcionando.** Monorepo (Turborepo + pnpm):
`apps/web` (Next.js 15 + Tailwind v4), `apps/worker` (BullMQ), `packages/core` (portas),
`packages/infra` (adapters), `packages/db` (Prisma + Postgres).

✅ Upload de documento (drag&drop) → armazenamento → fila → worker extrai
texto/páginas/metadata → biblioteca acende o card. Verificado ponta a ponta.

Falta para fechar a Fase 1: **leitor de PDF (PDF.js)** e **auth (Auth.js)**.
Veja o [roadmap](docs/ROADMAP.md).

## Rodando localmente

```bash
pnpm install
cp .env.example .env          # ajuste AUTH_SECRET (openssl rand -base64 32)
pnpm infra:up                 # sobe Postgres + Redis (Docker)
pnpm db:migrate               # cria o schema
pnpm dev                      # web + worker
```

## Estrutura

```
apps/web      Next.js 15 — UI + Route Handlers (BFF)
apps/worker   consumidor BullMQ — parse/OCR/capa/embeddings
packages/core domínio puro + portas (Storage/Search/AI/Parser)
packages/db   Prisma schema + client
```
