# Roadmap — CalmBook

Construção em **fatias verticais**: cada fase entrega algo *usável de ponta a ponta*, não
uma camada horizontal isolada. A ordem prioriza provar a arquitetura cedo e adiar o que é
caro/incerto. Detalhes técnicos em [`ARCHITECTURE.md`](ARCHITECTURE.md).

Legenda de esforço: 🟢 pequeno · 🟡 médio · 🔴 grande.

---

## Fase 0 — Arquitetura ✅ (atual)
Documentos de stack, arquitetura, modelo de dados e roadmap. **Você está aqui.**

---

## Fase 1 — Fundação + fatia vertical mínima 🔴
**Meta:** importar um PDF e lê-lo. Prova o caminho inteiro UI → BFF → core → fila → worker
→ banco → leitor.

- ✅ Scaffold do monorepo (Turborepo + pnpm): `web`, `worker`, `core`, `db`, `infra`.
- ✅ `docker-compose`: Postgres + Redis (portas 5433/6380). Prisma schema + migration.
- ⬜ Auth.js (e-mail/senha) — por ora usa usuário padrão (`voce@calmbook.local`).
- ✅ Upload de PDF → `StorageProvider` (FS) → cria Book `PROCESSING` → enfileira job.
- ✅ Worker: extrai texto, conta páginas, metadata → marca `READY`. (capa/thumbnail: pendente)
- ✅ Biblioteca: grid de cards + estado vazio + drag&drop + polling até `READY`.
- ✅ Leitor de PDF (PDF.js): render, navegação de página, teclado, zoom.
- ✅ Persistir `lastPage`/`zoom`/`progress` em `UserBook` (base da sincronização).

**Entregável:** ✅ dá pra subir um PDF e ler, com progresso salvo. *(Fase 1 essencial pronta;
resta auth opcional + capa/thumbnail)*

---

## Fase 2 — Identidade visual + organização 🟡
**Meta:** parecer e funcionar como CalmBook — calmo, organizado.

- 🟡 Design system: Navbar (logo, busca, upload, tema, perfil) + Sidebar completa.
- 🟡 Tema claro/escuro polido, vidro fosco, blur, transições (Framer Motion).
- 🟡 Prateleiras + Coleções + Tags (CRUD, N:N, arrastar livro pra prateleira).
- 🟡 CRUD completo do livro (editar metadata manual, capa, cor, prioridade, avaliação).
- 🟢 Filtros da sidebar: Continue Lendo, Favoritos, Em Leitura, Concluídos, Recentes.
- 🟢 Busca global Fase 1 (Postgres FTS: livro, autor, tag, nota).

**Entregável:** biblioteca organizável e agradável de navegar.

---

## Fase 3 — Anotações: o núcleo de estudo 🔴
**Meta:** o leitor vira ferramenta de estudo. Aqui mora o sistema de âncoras.

- 🔴 Sistema de âncoras resilientes (camada de texto do PDF.js) — fundação de tudo abaixo.
- 🟡 Marca-texto: seleção → menu de cores → destaque persistido e re-renderizado.
- 🟡 Comentário no destaque; painel lateral de Destaques.
- 🟡 Notas (markdown) em ponto da página; painel de Notas.
- 🟢 Marcadores (bookmarks) com nome/cor/categoria.
- 🟡 Stickers: overlay arrastável/redimensionável ancorado por fração.
- 🟢 Histórico/timeline básico (ActivityLog) + versionamento de notas.

**Entregável:** ler, destacar, anotar, marcar — tudo sobrevive a zoom/tema.

---

## Fase 4 — Leitor avançado + EPUB 🔴
**Meta:** experiência de leitura premium e multi-formato.

- 🔴 EPUB.js: reflow, paginação, ingestão de EPUB no worker.
- 🟡 Modos de visualização (Reflow, Kindle, Colunas, Rolagem Contínua, Tela Cheia).
- 🟡 Personalização de tipografia (fonte, tamanho, espaçamento, margem, justificação).
- 🟡 Galeria de temas (Sepia, Nord, Solarized, Dracula, Gruvbox, Tokyo Night, OLED…).
- 🟢 Sincronização completa de preferências por `UserBook`.
- 🟡 CBZ/CBR (viewer de imagens, modo revista).

**Entregável:** leitor que rivaliza com Kindle/Apple Books em conforto.

---

## Fase 5 — Inteligência (IA, OCR, busca total) 🔴
**Meta:** estudar com IA sobre o próprio conteúdo.

- 🟡 OCR sob demanda (Tesseract no worker) p/ PDFs escaneados → texto pesquisável.
- 🟡 Ações de IA ao selecionar (Haiku): explicar, resumir, traduzir, simplificar.
- 🔴 RAG por livro (embeddings Voyage + pgvector): "conversar com o livro", resumo por
  capítulo, glossário, perguntas de revisão — baseado só no conteúdo do usuário.
- 🟡 Flashcards (IA) + exportação Anki; Quiz (múltipla/V-F/dissertativa).
- 🟡 Busca total com Meilisearch (dentro do texto completo, typo-tolerant).

**Entregável:** CalmBook como ambiente de estudo assistido por IA.

---

## Fase 6 — Acompanhamento + diferenciais 🟡
**Meta:** acompanhar a evolução do aprendizado; recursos que destacam o produto.

- 🟡 Estatísticas (de ReadingSession): tempo, dias consecutivos, velocidade, horários.
- 🟢 Metas (minutos/páginas/livros/capítulos) com progresso.
- 🟡 Painel de citações (todos os destaques, filtros, export Markdown/CSV/BibTeX).
- 🟡 Timeline de leitura (início/pausa/conclusão + marcações no tempo).
- 🟡 Snapshots de sessão (página, zoom, tema, painéis, docs lado a lado).
- 🔴 Workspace dividido (dois documentos lado a lado).
- 🟢 Tempo real (Socket.IO): progresso de jobs, sync multi-aba.

---

## Fase 7+ — Visão de longo prazo 🔴
Caros/incertos — só depois do núcleo sólido.

- 🔴 Mapa de conhecimento (grafo navegável de livros/autores/tags/conceitos).
- 🔴 Sistema de plugins (sync com nuvem, export pra apps de notas, dicionários, acadêmico).
- 🟡 App desktop (Tauri) para leitura offline e arquivos locais.
- 🟡 Backup/exportação completa; migração FS→MinIO em produção.

---

## Sobre a ordem

A regra que guia tudo: **cada fase deixa um produto utilizável**. Se pararmos na Fase 3, já
temos uma biblioteca de PDFs anotável e bonita — útil de verdade. As peças caras da stack
"completa" (Meilisearch, MinIO, Tika, Socket.IO, grafo) entram exatamente quando o produto
as justifica, atrás das interfaces definidas na arquitetura — nunca como pré-requisito.
