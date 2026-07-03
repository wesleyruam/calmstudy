# CalmStudy

> **Plataforma de estudos baseada em leitura.** Cada livro, artigo ou apostila deixa de ser
> apenas um arquivo e vira um espaço de aprendizagem.

CalmStudy não é "mais um leitor de PDF/EPUB". É um ambiente onde a leitura **gera
conhecimento organizado**: cada destaque vira anotação, cada anotação se conecta a outras,
cada capítulo tem seus resumos e conceitos. Ao terminar um livro, você não tem só o
progresso — tem um material de estudo construído por você.

Reúne o melhor de uma biblioteca digital, um leitor moderno, um caderno de estudos e uma
base de conhecimento em um só lugar (inspirado em Kindle, Apple Books, Notion e Obsidian,
com identidade própria).

## Filosofia

Calma · foco · aprendizado · organização · reflexão · retenção.

Tudo respira: interface minimalista, muito espaço em branco, vidro fosco, sombras discretas,
animações suaves. As ferramentas de estudo aparecem só quando fazem sentido — a leitura
nunca é interrompida. **A IA não é o centro**: a plataforma tem que ser completa mesmo sem
nenhum recurso de inteligência artificial.

## Princípios

- O livro é apenas a origem do conhecimento.
- Toda leitura deve gerar aprendizado.
- O conhecimento pertence ao usuário, não ao documento.
- Estudar deve ser confortável; organização deve acontecer naturalmente.
- Tudo precisa ser pesquisável e reutilizável.

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

✅ Upload (drag&drop) → fila → worker extrai metadata → biblioteca acende o card.
✅ Leitor de PDF (PDF.js): página, navegação, zoom, progresso salvo (retoma onde parou).

Fase 1 essencial pronta. Próximo: **auth (Auth.js)** e **organização** (prateleiras,
coleções, tags — Fase 2). Veja o [roadmap](docs/ROADMAP.md).

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
