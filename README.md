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

## O que já funciona

**Biblioteca & importação**
- Upload por arrastar-e-soltar → fila → worker extrai metadados → o card acende sozinho.
- Coleções inteligentes (Com dúvidas, Sem anotações, Revisão pendente), favoritos, status de leitura.
- Autenticação (Auth.js): conta com e-mail/senha e sessão por JWT.

**Leitura** — três leitores, um mesmo ambiente de estudo
- **PDF** (PDF.js): modo página/livro, zoom, ajуste à largura, busca no documento, marcadores,
  modo foco, servido por HTTP Range (abre rápido, sem carregar o arquivo inteiro na memória).
- **EPUB**: parse no cliente (sumário, capítulos, imagens, tipografia própria).
- **MOBI** (Mobi6/PalmDOC): modo **página** (colunas estilo livro) ou **rolagem**.
- Progresso salvo em todos — retoma exatamente de onde parou.

**Bancada de estudo** (em todos os formatos)
- **Grifos** em 9 categorias (importante, definição, dúvida, revisar, exercício, citação…),
  com observação, prioridade, tags e nota rica anexada. Em texto refluível (EPUB/MOBI) a
  âncora é por posição de caractere — o grifo não sai do lugar ao mudar a fonte.
- **Anotações** e **perguntas** ligadas ao livro; **conceitos** relacionados; links entre páginas.
- Clicar num destaque na lista leva o leitor até ele no texto.
- **Tempo de estudo** (sessões) contabilizado; caderno por livro.

**Conhecimento & revisão**
- Base de conhecimento: conceitos que conectam destaques e anotações de vários livros.
- **Revisão espaçada** (repetição com intervalos crescentes) do que você marcou para revisar.
- Estatísticas, mapa e linha do tempo do seu estudo.
- Busca full-text (Postgres `tsvector`) sobre livros, destaques e notas.

**Espaços de estudo** (camada colaborativa, opcional)
- Crie um espaço a partir de um livro, convide por link e discuta **por página**.
- Objetivos do grupo, artefatos compartilhados (glossário, resumo…), papéis e moderação.
- Camada **Comunidade**: torne uma contribuição pública e ela aparece para quem lê o mesmo livro.
- A discussão vive dentro do leitor, num seletor de camadas (Pessoal · Comunidade · Espaço).

> Formatos: **PDF, EPUB, MOBI**. CBZ/CBR (quadrinhos) vêm depois.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack (com justificativas), arquitetura, leitor, pipeline de documentos, IA, busca, segurança |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Modelo de dados (entidades, relações, decisões de schema) |
| [`docs/STUDY-SPACES.md`](docs/STUDY-SPACES.md) | Espaços de estudo: camada colaborativa, contribuições, comunidade |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Construção em fases: do MVP enxuto até a visão completa |

## Rodando localmente

```bash
pnpm install
cp .env.example .env          # ajuste AUTH_SECRET (openssl rand -base64 32)
pnpm infra:up                 # sobe Postgres + Redis (Docker)
pnpm db:migrate               # cria o schema
pnpm dev                      # web + worker
```

App em `http://localhost:3000`. Comandos úteis: `pnpm typecheck`, `pnpm lint`,
`pnpm db:studio` (Prisma Studio), `pnpm mem` (monitor de RAM do next-server).

## Arquitetura

Monorepo Turborepo + pnpm. Domínio isolado da infraestrutura por **portas & adapters**.

```
apps/web      Next.js 15 (App Router) + Tailwind v4 — UI + Route Handlers (BFF)
apps/worker   consumidor BullMQ — parse de documentos, metadados, capa
packages/core domínio puro + portas (Storage/Search/AI/Parser)
packages/infra adapters (filesystem, parsers PDF/EPUB/MOBI, busca)
packages/db   Prisma schema + client (Postgres)
```

Detalhes e justificativas de stack em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
