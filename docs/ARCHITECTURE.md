# Arquitetura — CalmStudy

Documento de arquitetura e decisões técnicas. Sem código ainda; aqui definimos *o que*
construir e *por quê*, na ordem que reduz risco. O roadmap em fases está em
[`ROADMAP.md`](ROADMAP.md); o schema detalhado em [`DATA-MODEL.md`](DATA-MODEL.md).

---

## 1. Princípio diretor

O produto tem uma superfície enorme (biblioteca, leitor multi-formato, anotações,
stickers, IA, OCR, busca, estatísticas, metas, sincronização). Tentar construir tudo de
uma vez garante um projeto que nunca fica pronto.

**Estratégia:** uma arquitetura *modular e desacoplada* desde o dia 1, mas implementada
em **fatias verticais finas**. Cada peça da stack "completa" do brief (NestJS, MinIO,
Meilisearch, Tika, Redis) é o *estado final* de um módulo — não o ponto de partida. A
arquitetura abaixo permite começar enxuto e trocar cada peça por uma mais robusta sem
reescrever o domínio.

A regra que torna isso possível: **a lógica de domínio não conhece infraestrutura.**
O leitor não sabe se o arquivo veio do disco ou do S3; a busca não sabe se é Postgres ou
Meilisearch. Tudo atrás de interfaces (`StorageProvider`, `SearchProvider`,
`AIProvider`, `DocumentParser`).

---

## 2. Stack escolhida (e por quê)

O brief pedia "você decide a stack e explica". Aqui está, com o racional de cada troca
em relação à stack original sugerida.

### Aplicação (UI + BFF)

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | RSC + Route Handlers dão UI e API no mesmo lugar — elimina um backend separado no MVP. Streaming nativo ajuda no "respira/carrega suave". |
| Linguagem | **TypeScript** (estrito) | Tipos compartilhados entre cliente, servidor e worker via monorepo. |
| Estilo | **Tailwind CSS** + **shadcn/ui** (Radix) | Tailwind para o design system "calmo"; Radix garante acessibilidade nos primitivos (menus, dialogs) sem reinventar. |
| Animações | **Framer Motion** | Transições suaves, blur, vidro fosco — central na filosofia do produto. |
| Estado servidor | **TanStack Query** | Cache, sync em background, optimistic updates (essencial pra anotações). |
| Estado local | **Zustand** | Estado efêmero do leitor (zoom, página, painel aberto) sem prop drilling. |
| Validação | **Zod** | Um schema valida request, gera tipo e documenta o contrato. |
| Auth | **Auth.js v5 (NextAuth)** | Sessão, OAuth e e-mail/senha prontos; integra com Prisma. |

### Por que **não** NestJS separado no início

O brief sugere NestJS + Next.js como dois serviços. Para um produto *pessoal* (um usuário
por instância, ou poucos), isso é overhead: dois deploys, dois processos, duplicação de
tipos, CORS. O Next.js App Router já é um BFF competente.

**Mas** mantemos a porta aberta: toda a lógica vive em `packages/core` (serviços puros de
TypeScript, sem dependência de Next). Se um dia precisar de uma API pública, multi-tenant
pesado, ou times separados, `packages/core` é embrulhado por NestJS **sem tocar no
domínio**. A decisão de "monolito modular agora, serviços depois" é reversível de propósito.

### Domínio e dados

| Camada | Escolha | Por quê |
|---|---|---|
| ORM | **Prisma** | Schema declarativo, migrations, type-safety ponta a ponta. Como no brief. |
| Banco | **PostgreSQL** | JSONB (metadata flexível por formato), full-text search nativo, `pg_trgm` (busca difusa), concorrência real. Roda em Docker localmente em segundos. |
| Por que **não** SQLite | — | Tentador pro MVP, mas a busca interna, FTS, JSONB e a futura migração para Meilisearch/embeddings ficam muito mais naturais já em Postgres. Evita uma migração dolorosa depois. |

### Processamento de documentos (o coração pesado)

Extrair texto, gerar capas, rodar OCR e gerar embeddings é **lento e bloqueante** — não
pode acontecer dentro de uma request HTTP. Precisa ser assíncrono desde o começo.

| Peça | Escolha | Por quê |
|---|---|---|
| Fila | **BullMQ + Redis** | Jobs com retry, progresso, prioridade. Redis também serve cache/sessão depois. |
| Worker | **Processo Node separado** (`apps/worker`) | Mesmo monorepo, mesmos tipos, deploy independente. Escala sem afetar a UI. |
| Parsing | **`pdf-parse` / `unpdf`** (PDF) + **`epubjs`/`epub2`** (EPUB) no MVP; **Apache Tika** depois | Tika cobre DOCX/MOBI/HTML/etc. num só lugar, mas é um serviço Java — entra na Fase 2, quando a variedade de formatos justifica. |
| OCR | **Tesseract** (via `tesseract.js` no worker, ou binário) | PDFs escaneados → texto pesquisável. Job sob demanda, nunca no upload. |
| Metadata | extração própria + lookup externo opcional (Open Library / Google Books por ISBN) | Preenche título/autor/capa/ano automaticamente; usuário corrige manualmente. |

### Renderização no cliente

| Formato | Engine | Notas |
|---|---|---|
| PDF | **PDF.js** | Render original (canvas) + extração de camada de texto para seleção/destaque. |
| EPUB | **EPUB.js** | Reflow nativo, paginação, temas — base dos "modos de leitura". |
| Texto/Markdown | render próprio | Reflow total, todas as personalizações de tipografia. |
| CBZ/CBR | viewer de imagens | Descompacta e pagina imagens (modo revista/quadrinho). |

A camada de **anotações/destaques/stickers** é *própria e independente da engine*: ela
opera sobre um sistema de coordenadas normalizado (ver §5), para que um destaque sobreviva
a mudança de zoom, fonte ou modo de visualização.

### Busca

- **Fase 1:** Postgres FTS (`tsvector`) + `pg_trgm` para fuzzy. Cobre livro, autor, notas,
  tags — suficiente pra começar.
- **Fase 2:** **Meilisearch** quando entrar busca *dentro do texto completo* dos livros com
  ranking e typo-tolerance instantâneos. Atrás da interface `SearchProvider`, a troca é local.

### IA

Construímos sobre a **Claude API (Anthropic)**, usando os modelos mais capazes:

- **Opus 4.8 (`claude-opus-4-8`)** — tarefas pesadas de raciocínio: resumos por capítulo,
  geração de quiz dissertativo, mapa de conceitos, "conversar com o livro inteiro".
- **Haiku 4.5 (`claude-haiku-4-5-20251001`)** — ações inline rápidas e baratas ao selecionar
  texto: explicar, simplificar, traduzir, criar flashcard.
- **Embeddings:** Anthropic recomenda **Voyage AI** para embeddings. Usamos para o "mapa de
  conhecimento" (similaridade entre livros/conceitos) e para **RAG por livro** — o chat
  responde *baseado apenas no conteúdo enviado pelo usuário*, recuperando trechos relevantes.
- Vetores ficam em **`pgvector`** (extensão Postgres) — sem mais um serviço no início.

Tudo atrás de `AIProvider`, então trocar de modelo ou provedor é configuração, não reescrita.

### Storage de arquivos

- **Dev:** filesystem local (`./storage`).
- **Prod:** **S3-compatível (MinIO)**, como no brief.
- Interface `StorageProvider` — código de upload/leitura idêntico nos dois.

### Tempo real

- **Socket.IO** (ou Server-Sent Events) para: progresso de jobs (OCR rodando…),
  sincronização entre abas/dispositivos e presença em comentários. Entra quando houver
  multi-dispositivo real (Fase 3) — antes disso, polling do TanStack Query basta.

---

## 3. Visão de alto nível

```
                         ┌──────────────────────────────────────┐
                         │              Navegador                │
                         │  Next.js (RSC) · React · Tailwind     │
                         │  PDF.js · EPUB.js · Zustand/TanStack  │
                         └───────────────┬──────────────────────┘
                                         │ HTTP / WebSocket
                         ┌───────────────▼──────────────────────┐
                         │        Next.js — Route Handlers       │
                         │              (BFF / API)              │
                         │  Auth.js · Zod · chama packages/core  │
                         └───────┬───────────────┬──────────────┘
                                 │               │
                  ┌──────────────▼──┐     ┌──────▼─────────┐
                  │  packages/core  │     │  Fila (BullMQ) │
                  │  domínio puro:  │     │     Redis      │
                  │  Books, Reader, │     └──────┬─────────┘
                  │  Notes, AI, ... │            │
                  └───┬────────┬────┘     ┌──────▼──────────────┐
                      │        │          │     apps/worker     │
            ┌─────────▼┐  ┌────▼──────┐   │  parse · OCR · capa │
            │ Postgres │  │  Storage  │   │  metadata · embed   │
            │ +pgvector│  │ FS / MinIO│   └──────┬──────────────┘
            └──────────┘  └───────────┘          │
                  ▲                               │
                  └───────── grava resultados ────┘
                                 │
                         ┌───────▼────────┐
                         │ Busca (PG FTS  │
                         │ → Meilisearch) │
                         └────────────────┘
```

### Fluxo de upload (exemplo do desacoplamento)

1. Usuário arrasta `livro.pdf` → Route Handler valida (Zod), grava o binário via
   `StorageProvider`, cria `Book` com status `PROCESSING`, **enfileira** job e responde na hora.
2. UI mostra o card já com placeholder e barra de progresso.
3. `apps/worker` pega o job: extrai texto, gera capa/thumbnail, busca metadata por ISBN,
   conta páginas, gera embeddings, indexa pra busca.
4. Worker emite progresso (Socket.IO/SSE) e marca `READY`. O card "acende".

Nenhuma dessas etapas trava a request original — princípio para todo trabalho pesado.

---

## 4. Estrutura do monorepo

**Turborepo + pnpm workspaces.** Builds incrementais com cache, tipos compartilhados,
deploys independentes.

```
calmstudy/
├─ apps/
│  ├─ web/                 # Next.js: UI + Route Handlers (BFF)
│  │  ├─ app/
│  │  │  ├─ (app)/         # área autenticada: biblioteca, leitor, config
│  │  │  ├─ (auth)/        # login, signup
│  │  │  └─ api/           # route handlers finos → chamam core
│  │  ├─ components/       # design system (Navbar, Sidebar, Card, Reader...)
│  │  └─ stores/           # Zustand (estado do leitor)
│  └─ worker/              # consumidor BullMQ: parse, OCR, capa, embeddings
├─ packages/
│  ├─ core/                # DOMÍNIO PURO (sem Next): casos de uso + interfaces
│  │  ├─ books/  notes/  reader/  shelves/  ai/  search/  stats/
│  │  └─ ports/            # StorageProvider, SearchProvider, AIProvider, DocumentParser
│  ├─ db/                  # Prisma schema + client + migrations
│  ├─ ui/                  # primitivos compartilhados (se web crescer)
│  └─ config/              # eslint, tsconfig, tailwind preset
├─ docker-compose.yml      # postgres, redis, (minio, meilisearch depois)
└─ turbo.json
```

A separação **`web` (entrega) vs `core` (regras) vs `worker` (trabalho pesado)** é a coluna
vertebral. Tudo que for difícil de mudar depois (banco, storage, IA, busca) está atrás de
uma porta em `core/ports`.

---

## 5. Arquitetura do leitor (a parte mais difícil)

O leitor é onde o produto vive ou morre. O desafio central: **anotações, destaques,
marcadores e stickers precisam sobreviver** a mudança de zoom, fonte, tema, modo de
visualização e até reflow de texto. Eles não podem ser presos a coordenadas de pixel.

### Sistema de âncoras

Toda marcação guarda uma **âncora resiliente**, não um pixel:

- **PDF:** `{ page, textRange: {start, end} }` sobre a camada de texto do PDF.js +
  *fallback* de retângulos normalizados (`x,y,w,h` em fração 0–1 da página) para
  destaques sobre imagens/escaneados.
- **EPUB/Texto:** **CFI** (EPUB Canonical Fragment Identifier) ou um seletor de range
  textual (quote + prefixo/sufixo, estilo W3C Web Annotations) — robusto a reflow.
- **Stickers:** posição relativa `{ page, x, y }` em fração + `rotation` + `scale`.

Assim um destaque feito no "Modo Kindle" continua certo no "Modo Colunas".

### Camadas de render (empilhadas)

```
┌─────────────────────────────────────┐
│  Camada de interação (seleção, menu) │  ← captura seleção → menu de cores / IA
├─────────────────────────────────────┤
│  Camada de stickers (drag/resize)    │  ← overlay absoluto, ancorado por fração
├─────────────────────────────────────┤
│  Camada de anotações/destaques (SVG) │  ← desenha sobre âncoras resolvidas
├─────────────────────────────────────┤
│  Camada de conteúdo (PDF.js/EPUB.js) │  ← a página renderizada
└─────────────────────────────────────┘
```

### Estado do leitor (Zustand)

Página atual, zoom, modo de visualização, tema, tipografia, painel lateral aberto.
Persistido em `UserBook` (servidor) com **debounce** + optimistic update — é a base da
**sincronização**: reabrir em outro dispositivo restaura página, zoom, fonte e tema.

### Modos e temas

Os "modos de visualização" (Original, Reflow, Kindle, Colunas, Revista, Rolagem
Contínua…) são *estratégias de layout* sobre a mesma engine. Os temas (Sepia, Nord,
Dracula, OLED…) são **tokens de design** (CSS variables) — adicionar tema é adicionar um
preset, não código novo.

---

## 6. Segurança e privacidade

- Conteúdo do usuário é privado por padrão. Toda query filtra por `userId`; nada de IDs
  sequenciais expostos sem checagem de posse.
- Arquivos servidos por **URLs assinadas** com expiração (não links públicos diretos).
- Uploads validados por tipo/tamanho; parsing roda **isolado no worker** (documentos são
  entrada não-confiável — PDFs podem ter conteúdo malicioso).
- Dados enviados à IA saem para um provedor externo: isso fica **explícito e opt-in** nas
  configurações, com a opção de desligar recursos de IA por completo.
- Segredos só no servidor/worker; nunca no bundle do cliente.

---

## 7. Decisões resolvidas (2026-06-29)

1. **Multi-user-ready, foco single-user.** Contas reais (Auth.js) e `userId` em todas as
   queries desde o dia 1, mas sem recursos sociais/compartilhamento. O dono usa como app
   pessoal; abrir para mais usuários depois não exige migração de schema.
2. **Web primeiro.** Desktop (Tauri) para leitura offline/arquivos locais fica para fase
   tardia (Roadmap 7+). Simplicidade e alcance pesam mais agora.
3. **MOBI/AZW → convertidos para EPUB na ingestão** (Calibre `ebook-convert` no worker),
   em vez de render nativo de formato fechado. O leitor lida só com PDF/EPUB/imagens.

### Ainda em aberto (sem urgência)

- **Mapa de conhecimento** (grafo) é caro de fazer bem — fica para depois do núcleo sólido
  (Roadmap 7+).

---

## 8. Próximo passo concreto

Ver [`ROADMAP.md`](ROADMAP.md). Em resumo, a **Fase 1** é uma fatia vertical:
scaffold do monorepo → upload de PDF → processamento no worker → biblioteca em cards →
leitor de PDF com página/zoom/tema → destaque básico persistido. Isso prova a arquitetura
inteira (UI → BFF → core → fila → worker → banco → leitor) num caminho fino e real.
