# Modelo de Dados — CalmStudy

Refinamento do schema do brief. Notação conceitual (não é Prisma final, mas mapeia 1:1).
Princípios: tudo pertence a um `User`; metadata flexível em **JSONB**; marcações usam
**âncoras resilientes** (ver `ARCHITECTURE.md` §5), não pixels.

---

## Separação chave: `Book` vs `UserBook`

O brief já acerta nisso e vale reforçar **por quê**:

- **`Book`** = o documento em si (título, autor, ISBN, arquivo, páginas). Fato objetivo.
- **`UserBook`** = a *relação do usuário* com o livro (progresso, status, favorito,
  preferências de leitura, avaliação).

Isso permite que o mesmo `Book` seja compartilhado/deduplicado entre usuários no futuro,
sem misturar dado objetivo com estado pessoal. Quase toda marcação (notas, destaques,
stickers) aponta para `UserBook`, não `Book` — são *do usuário*, não do documento.

---

## Entidades

### User
```
id            uuid pk
name          string
email         string unique
passwordHash  string?           # null se OAuth
image         string?
createdAt     datetime
settings      jsonb             # idioma, tema padrão, flags de IA/OCR, atalhos
```

### Book
```
id          uuid pk
title       string
author      string?
description  text?
coverUrl    string?
isbn        string?
language    string?
pages       int?
format      enum(PDF,EPUB,MOBI,CBZ,CBR,TXT,MD,DOCX,HTML)
fileKey     string             # chave no StorageProvider (FS/MinIO)
fileSize    bigint
status      enum(UPLOADING,PROCESSING,READY,FAILED)
metadata    jsonb              # ano, editora, categorias, dados específicos do formato
textContent text?              # texto extraído (p/ FTS) — ou tabela à parte se grande
createdAt   datetime
```

### UserBook   (a "estante pessoal")
```
id          uuid pk
userId      → User
bookId      → Book
status      enum(WANT_TO_READ,READING,FINISHED,PAUSED)
progress    float              # 0..1
favorite    bool
rating      int?               # 0..5
priority    enum(LOW,MED,HIGH)?
color       string?            # cor do card
lastPage    int
lastReadAt  datetime?
# --- preferências de leitura sincronizadas ---
theme       string?            # sepia, nord, dracula, oled...
viewMode    string?            # original, reflow, kindle, colunas...
font        string?
fontSize    int?
lineHeight  float?
zoom        float?
prefs       jsonb              # margens, justificação, animações etc. (extensível)

@@unique(userId, bookId)
```

### Shelf  (prateleira — N:N com UserBook)
```
id      uuid pk
userId  → User
name    string
color   string?
icon    string?
```

### Collection  (coleção — ex: OSCP, Faculdade)
```
id      uuid pk
userId  → User
name    string
description text?
```

> **Prateleira vs Coleção:** prateleira é organização tipo estante (Programação, Romance);
> coleção é agrupamento por objetivo/contexto (OSCP, Trabalho). Estruturalmente são iguais
> (N:N com UserBook) — separadas por intenção/UX, não por schema. Um livro pode estar em
> várias de ambas.

### Tag
```
id      uuid pk
userId  → User
name    string             # sem o "#"; único por usuário
color   string?
@@unique(userId, name)
```

### Tabelas de junção (N:N)
```
UserBookShelf       (userBookId, shelfId)
UserBookCollection  (userBookId, collectionId)
UserBookTag         (userBookId, tagId)
HighlightTag        (highlightId, tagId)   # destaques também têm tags
```

---

## Marcações (ancoradas, resilientes a zoom/fonte/modo)

### Highlight  (marca-texto)
```
id          uuid pk
userBookId  → UserBook
page        int?
color       enum(YELLOW,GREEN,BLUE,PURPLE,RED,ORANGE)
text        text               # texto destacado (snapshot)
anchor      jsonb              # {textRange | cfi | rects normalizados} — ver §5
comment     text?
createdAt   datetime
```

### Note  (anotação rica em qualquer ponto)
```
id          uuid pk
userBookId  → UserBook
page        int?
position    jsonb              # {x,y} fração da página, opcional
content     text               # markdown; pode conter checklist/código/imagem/link
color       string?
createdAt   datetime
updatedAt   datetime
```

### Bookmark  (marcador)
```
id          uuid pk
userBookId  → UserBook
page        int
title       string?
description text?
color       string?
category    string?
```

### Sticker  (adesivos estilo planner)
```
id          uuid pk
userBookId  → UserBook
page        int
x, y        float              # fração 0..1
rotation    float
scale       float
type        string             # emoji/preset ou ref a sticker custom
```

### Comment  (ancorado no texto, estilo Google Docs)
```
id          uuid pk
userBookId  → UserBook
anchor      jsonb              # mesmo esquema de âncora do Highlight
content     text
parentId    → Comment?         # threads/respostas
createdAt   datetime
```

---

## Estudo & IA

### Flashcard
```
id          uuid pk
userBookId  → UserBook
front, back text
source      enum(AI,MANUAL)
sourcePage  int?
deck        string?            # p/ exportação Anki
```

### Quiz / QuizQuestion
```
Quiz:         id, userBookId, title, createdAt
QuizQuestion: id, quizId, type(MULTIPLE,TRUE_FALSE,OPEN), prompt,
              options jsonb?, answer, explanation?
```

### Embedding   (RAG por livro + mapa de conhecimento)  — pgvector
```
id          uuid pk
bookId      → Book
chunkText   text
embedding   vector             # pgvector
page        int?
```

---

## Acompanhamento

### ReadingSession  (base de estatísticas, metas, timeline)
```
id          uuid pk
userBookId  → UserBook
startedAt   datetime
endedAt     datetime?
startPage   int
endPage     int
durationSec int
```
> Estatísticas (tempo lido, velocidade, dias consecutivos, horários, categorias mais
> lidas) são **derivadas** de `ReadingSession` — não guardamos números pré-agregados que
> podem dessincronizar. Cache de agregados é otimização posterior.

### Goal  (metas)
```
id          uuid pk
userId      → User
type        enum(MINUTES,PAGES,BOOKS,CHAPTERS)
target      int
period      enum(DAILY,WEEKLY,MONTHLY,TOTAL)
startDate, endDate
```

### ActivityLog  (histórico / timeline — "ontem você destacou pág. 88")
```
id          uuid pk
userId      → User
userBookId  → UserBook?
action      string             # HIGHLIGHT_CREATED, NOTE_CREATED, FONT_CHANGED...
payload     jsonb
createdAt   datetime
```

### NoteVersion  (versionamento de anotações — diferencial do brief)
```
id        uuid pk
noteId    → Note
content   text
createdAt datetime
```
> Mantém histórico de edições de `Note`/`Comment` para restaurar versões anteriores.

---

## Notas de design do schema

- **JSONB onde o formato varia** (`Book.metadata`, `UserBook.prefs`, âncoras): cada formato
  (PDF/EPUB/CBZ) tem campos diferentes; colunas rígidas para tudo seria frágil. JSONB
  mantém flexibilidade e ainda é indexável no Postgres.
- **Âncoras como JSONB**, não colunas: o esquema de âncora difere por engine (range de
  texto, CFI, retângulos). Encapsular em `anchor` deixa a resolução por conta do leitor.
- **Cascade de deleção:** apagar `UserBook` apaga suas marcações; apagar `Book` só é
  permitido se nenhum `UserBook` referencia (ou via fluxo explícito).
- **Soft-delete** provável para `Book`/`UserBook` (lixeira "Excluir" do card) — flag
  `deletedAt` em vez de remoção imediata.
- **FTS:** coluna `tsvector` gerada sobre `Book.title/author/textContent` + índice GIN;
  `pg_trgm` para fuzzy em títulos/autores.
```
