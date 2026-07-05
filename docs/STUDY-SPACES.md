# Espaços de Estudo — CalmStudy

Documento de design da **camada colaborativa** do CalmStudy. Como sempre: define *o
quê* e *por quê* antes de código. Complementa [`ARCHITECTURE.md`](ARCHITECTURE.md),
[`DATA-MODEL.md`](DATA-MODEL.md) e [`ROADMAP.md`](ROADMAP.md).

Status: **proposta** (nada implementado). É uma visão de longo prazo; a plataforma
individual (E1–E5 + leitor imersivo) continua sendo a base sólida sobre a qual isto se apoia.

---

## 1. O que é (e o que não é)

Um **Espaço de Estudo** é um ambiente colaborativo onde 2+ pessoas estudam o **mesmo
material**, cada uma no seu ritmo, construindo uma camada de conhecimento **compartilhada
e sempre contextualizada no livro**. Ex.: "TryHackMe Team" — um livro, alguns amigos,
dúvidas e resumos nascendo direto dos trechos.

**Não é rede social.** Sem feed infinito, algoritmo de recomendação, curtidas como métrica
de vaidade, perfis de influenciador ou qualquer gatilho de distração. Toda função "social"
só existe se contribuir direto para a construção do conhecimento. Discussão sempre **nasce
do material** — nunca um chat solto.

O livro deixa de ser arquivo estático e vira **ambiente vivo**: quem abrir um trecho meses
depois encontra a construção coletiva (perguntas respondidas, explicações, exemplos, resumos).

---

## 2. Princípio nº 0 — Privacidade por padrão, compartilhamento por consentimento

> **Nada é compartilhado sem uma ação explícita do usuário. Ponto.**

Este é o princípio que mais molda o modelo de dados. Ele não é uma regra de UI que se
verifica na tela — é **estrutural**. As invariantes:

1. **Tudo nasce privado.** Criar um destaque/nota/pergunta no leitor **nunca** compartilha
   nada. O conteúdo pessoal vive nas tabelas pessoais (`Highlight`, `Note` por `UserBook`) e
   é invisível para qualquer outra pessoa.
2. **Compartilhar é por item e explícito.** O usuário escolhe "compartilhar com [espaço]"
   ou "tornar público" em um item específico. Não existe propagação automática nem em lote.
3. **Compartilhar é um *snapshot* reversível.** Ao promover um conteúdo pessoal para um
   espaço, cria-se uma **cópia** na camada compartilhada. Editar o original privado **não**
   altera a cópia (e vice-versa). "Descompartilhar" = remover a cópia; o original privado
   permanece intacto.
4. **Entrar num espaço não expõe nada da sua biblioteca.** Ser membro ≠ ser exposto. Seu
   progresso só aparece se você **optar** (`shareProgress`).
5. **Visibilidade nunca escala sozinha.** ESPAÇO → PÚBLICO exige nova ação explícita.
   Sair de um espaço ou apagá-lo **não** publica nada automaticamente.
6. **Direito de retirada.** O autor pode apagar/descompartilhar suas contribuições a
   qualquer momento. Ao sair de um espaço, o sistema **pergunta** se quer remover o que
   contribuiu.
7. **Público é opt-in e moderado.** Só vai para a comunidade o que o autor marcar público.
   Descoberta jamais revela conteúdo privado ou de espaço.
8. **Atribuição honesta e mínima.** Mostra o autor; sem métricas de vaidade nem ranking
   por popularidade.

Consequência de design: **a camada compartilhada é um conjunto de tabelas separadas**
(§5). Conteúdo privado *não tem `spaceId`*. Para algo ser compartilhado, precisa **existir
como uma contribuição** — o que só acontece por ação do usuário. Isso torna o vazamento
acidental impossível por construção, não por checagem.

---

## 3. As três decisões que definem o resto

### 3.1 Auth / multiusuário é pré-requisito duro
Hoje o app é single-user (`getOrCreateDefaultUser`, e-mail padrão `voce@calmstudy.local`).
Colaboração exige identidade real. **Fase 0 obrigatória.** Inclui autorização de acesso a
arquivos (hoje `/api/files/[key]` serve sem checar dono — precisa passar a checar).

### 3.2 Alinhamento de âncoras — a decisão mais crítica
Toda a camada colaborativa depende de **âncoras estáveis e compartilhadas**: quando dois
membros abrem "página 23, este parágrafo", tem que ser *o mesmo trecho*. Isso exige que
todos estejam na **mesma edição/paginação** do material.

Duas formas de garantir isso — e a diferença tem peso **jurídico**:

- **Opção A — arquivo compartilhado:** um upload, todos os membros leem o mesmo arquivo.
  Simples, mas **redistribui o arquivo** (problema de direitos autorais se o material for
  protegido).
- **Opção B — casar por hash, sem redistribuir (recomendada):** cada membro tem sua
  própria cópia (obtida legalmente); o sistema calcula `contentHash` (sha256) e **casa**
  cópias idênticas no mesmo `Book` canônico. O **arquivo não é compartilhado** — só a
  *identidade do livro* + as anotações compartilhadas (âncoras book-relativas). Se os
  hashes divergem (edições diferentes), degrada com elegância: cai para âncora por
  página/capítulo ou avisa "edição diferente".

**Recomendação:** Opção B como padrão (respeita direitos autorais e a filosofia de
privacidade), com Opção A liberada quando o espaço **tem os direitos**: documentos
próprios, RFCs, domínio público, docs internos de empresa, PDFs do próprio grupo.

### 3.3 Async-first; tempo real depois
O valor central — discussão contextual que **persiste** e alguém encontra meses depois —
**não precisa** de tempo real. "Estudar ao mesmo tempo" com cursores/presença ao vivo é
uma camada opcional cara (websocket/CRDT) que dá para adiar sem perder a essência.

Nota de granularidade: "cada **parágrafo** pode ter pergunta" é robusto em **EPUB/reflow**
(âncora por offset de texto). Em PDF não existe parágrafo — só página + trecho selecionado
(rects normalizados, que já temos). Então "parágrafo real" amarra na pendência do **leitor
EPUB**. Página + trecho a gente entrega já.

---

## 4. Modelo canônico de livro

Reforço do que `DATA-MODEL.md` já antecipa (`Book` vs `UserBook`):

- **`Book`** = o documento objetivo. **Novo campo:** `contentHash` (sha256 do arquivo),
  para deduplicar/casar edições idênticas entre usuários.
- **`UserBook`** = a relação de cada usuário (progresso, destaques, preferências). Continua
  por-usuário.
- **Âncora book-relativa:** contribuições compartilhadas ancoram em `bookId` + página +
  rects (não em `userBookId`). Assim, o leitor de qualquer membro (que tem *seu* `UserBook`
  do mesmo `Book`) sobrepõe a camada compartilhada nas mesmas coordenadas.

Ao entrar num espaço, o membro passa a ter um `UserBook` do `Book` canônico do espaço
(progresso/destaques pessoais próprios), casado por `contentHash` quando ele já tem o
arquivo, ou — na Opção A — com acesso de leitura concedido pela participação.

---

## 5. Modelo de dados (conceitual)

Duas famílias, **separadas** do conteúdo pessoal:

### 5.1 Estrutura do espaço

```
StudySpace
  id, name, slug, description
  ownerId        → User
  bookId         → Book (material canônico; 1 livro por espaço no v1)
  visibility     PRIVATE | PUBLIC            (default PRIVATE)
  fileSharing    HASH_MATCH | SHARED_FILE    (§3.2; default HASH_MATCH)
  createdAt

SpaceMember
  id, spaceId → StudySpace, userId → User
  role         OWNER | MODERATOR | MEMBER | VIEWER
  shareProgress Boolean  (default false — consentimento p/ progresso coletivo)
  joinedAt
  unique(spaceId, userId)

SpaceInvite
  id, spaceId, code (link), role, invitedEmail?
  createdBy → User, expiresAt, acceptedBy?/acceptedAt?
```

### 5.2 Camada de discussão — `Contribution`
Q&A / comentários / notas ancoradas. Cada contribuição **tem dono** e é, por definição, um
item que o usuário **escolheu** criar na camada compartilhada.

```
Contribution
  id
  spaceId    → StudySpace         (a qual espaço pertence)
  authorId   → User
  bookId     → Book               (âncora book-relativa)
  kind       QUESTION | COMMENT | ANSWER | NOTE | REFERENCE | EXERCISE
  anchorType BOOK | CHAPTER | PAGE | RANGE | CONCEPT
  anchor     Json    { page?, rects?, chapter?, conceptId?, quotedText? }
  content    Json (TipTap)  + contentText (busca FTS, reusa o padrão por trigger)
  parentId?  → Contribution       (respostas/thread)
  visibility SPACE | PUBLIC        (nunca "privado": privado = não existir aqui)
  createdAt, updatedAt, deletedAt?
  (marca opcional de "útil" — sinal de utilidade, não curtida; talvez adiar)
```

- **Promover** um conteúdo pessoal → cria uma `Contribution` com `content` **copiado**
  (snapshot). O `Note`/`Highlight` original continua privado e desconectado (§2.3).
- `quotedText` guarda o trecho citado por extenso, para a discussão ser legível mesmo se o
  render mudar.

### 5.3 Artefatos colaborativos — `SpaceArtifact`
Documentos **co-editáveis** do espaço (diferente de discussão, que é de autor). Resumo por
capítulo, glossário, conceitos/refs compartilhados, exercícios, objetivos.

```
SpaceArtifact
  id, spaceId → StudySpace
  type      SUMMARY | GLOSSARY_TERM | CONCEPT | REFERENCE | EXERCISE | OBJECTIVE
  anchor    Json  { chapter?, term?, page? }
  title, content Json (TipTap) + contentText
  updatedBy → User, updatedAt
  revisions ArtifactRevision[]     (histórico + atribuição por edição)
```

### 5.4 Progresso coletivo
Derivado (read-only) de `UserBook.progress` dos membros **que optaram** (`shareProgress`).
Nada novo é gravado; é agregação com consentimento.

---

## 6. Integração com o leitor

O painel por página (que já construímos) ganha um **seletor de camadas**:

- **Pessoal** (padrão) — seus destaques/notas/perguntas privados. Igual a hoje.
- **Espaço [X]** — contribuições e artefatos daquele espaço, ancorados na página.
- **Comunidade** — contribuições públicas (quando existir a Fase 4).

Regras de UI que refletem o princípio nº 0:
- Compor na camada "Espaço" cria uma `Contribution` (ação explícita e óbvia).
- Todo item pessoal tem uma ação discreta **"Compartilhar → [espaço]"** (nunca automática).
- Marcadores de trecho com discussão usam um estilo distinto (ex.: ponto/avatar sutil) para
  sinalizar "aqui tem construção coletiva", sem poluir.
- O seletor deixa **sempre visível** em que camada você está escrevendo — nada de publicar
  achando que era privado.

---

## 7. Papéis e moderação

| Papel | Pode |
|-------|------|
| OWNER | gerir espaço/membros/convites; moderar (remover) qualquer contribuição; editar artefatos |
| MODERATOR | moderar contribuições; editar artefatos |
| MEMBER | criar contribuições; editar artefatos (se permitido); compartilhar o próprio conteúdo |
| VIEWER | só leitura (útil para espaços públicos) |

Moderação da camada pública (Fase 4) é mais séria: denúncia, remoção, e a garantia de que
nada privado/espaço vaza para descoberta.

---

## 8. Roadmap em fases

- **Fase 0 — Fundação multiusuário** *(bloqueante)*
  Auth.js (login real), migração do usuário padrão, **autorização de acesso a arquivos**,
  `Book.contentHash` + dedup no upload.
- **Fase 1 — Espaços core**
  `StudySpace`/`SpaceMember`/`SpaceInvite`, criar/convidar (link)/papéis, home do espaço
  (membros, objetivos, progresso coletivo opt-in).
- **Fase 2 — Camada contextual (discussão)**
  `Contribution` ancorada (página+trecho), seletor de camadas no leitor, compor no espaço,
  promover item pessoal (snapshot), visibilidade privada/espaço. Threads (perguntas↔respostas).
- **Fase 3 — Artefatos colaborativos**
  `SpaceArtifact` co-editável: resumo por capítulo, glossário, conceitos/refs compartilhados,
  exercícios, com histórico/atribuição.
- **Fase 4 — Camada pública + descoberta**
  `visibility=PUBLIC`, descobrir espaços/livros públicos, agregação de conhecimento da
  comunidade por página, moderação/denúncia.
- **(Opcional, depois) — Tempo real**
  Presença/cursores ao vivo (websocket/CRDT). Não bloqueia nada acima.

---

## 9. Questões em aberto (decidir antes de cada fase)

- **1 livro por espaço** (v1) vs. múltiplos livros por espaço (join `SpaceBook`).
- **Comunidade pública:** um "espaço público global" por livro vs. muitos espaços públicos
  agregados por `contentHash`.
- **Conceitos:** conceito pessoal (existe) → conceito de espaço (`SpaceArtifact type=CONCEPT`).
  Como mapear/mesclar sem duplicar.
- **Sinal de utilidade:** ter ou não "útil" nas respostas (ajuda a ordenar sem virar curtida).
- **Direitos autorais:** default HASH_MATCH; deixar claro na UI quando SHARED_FILE é permitido.
- **Retenção ao sair/apagar espaço:** perguntar sempre; nunca publicar por omissão.
```
