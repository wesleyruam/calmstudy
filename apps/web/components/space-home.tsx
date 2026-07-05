"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  Link2,
  Copy,
  Check,
  Trash2,
  LogOut,
  Plus,
  Target,
  FileText,
  Globe,
  Lock,
} from "lucide-react";
import {
  ROLE_LABEL,
  canManage,
  type SpaceDetail,
  type SpaceInviteDTO,
  type SpaceObjectiveDTO,
} from "@/lib/space-shared";

export function SpaceHome({ space, myUserId }: { space: SpaceDetail; myUserId: string }) {
  const router = useRouter();
  const manage = canManage(space.myRole);
  const isOwner = space.myRole === "OWNER";

  const [invites, setInvites] = useState<SpaceInviteDTO[]>(space.invites);
  const [objectives, setObjectives] = useState<SpaceObjectiveDTO[]>(space.objectives);
  const [shareProgress, setShareProgress] = useState(space.myShareProgress);
  const [visibility, setVisibility] = useState(space.visibility);
  const myMember = space.members.find((m) => m.userId === myUserId);

  async function setSpaceVisibility(v: "PRIVATE" | "PUBLIC") {
    setVisibility(v);
    await fetch(`/api/spaces/${space.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: v }),
    });
  }

  async function genInvite() {
    const res = await fetch(`/api/spaces/${space.id}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "MEMBER" }),
    });
    if (res.ok) {
      const { code } = await res.json();
      setInvites((prev) => [...prev, { code, role: "MEMBER" }]);
    }
  }

  async function toggleShare() {
    if (!myMember) return;
    const next = !shareProgress;
    setShareProgress(next);
    await fetch(`/api/spaces/${space.id}/members/${myMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareProgress: next }),
    });
    router.refresh();
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/spaces/${space.id}/members/${memberId}`, { method: "DELETE" });
    router.refresh();
  }

  async function leave() {
    if (!myMember) return;
    if (!confirm("Sair deste espaço? Sua biblioteca e anotações pessoais permanecem.")) return;
    await fetch(`/api/spaces/${space.id}/members/${myMember.id}`, { method: "DELETE" });
    router.push("/espacos");
  }

  async function removeSpace() {
    if (!confirm("Excluir o espaço para todos? Nada pessoal dos membros é apagado.")) return;
    await fetch(`/api/spaces/${space.id}`, { method: "DELETE" });
    router.push("/espacos");
  }

  async function addObjective(text: string) {
    const res = await fetch(`/api/spaces/${space.id}/objectives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const { objective } = await res.json();
      setObjectives((prev) => [...prev, objective]);
    }
  }

  async function toggleObjective(o: SpaceObjectiveDTO) {
    setObjectives((prev) => prev.map((x) => (x.id === o.id ? { ...x, done: !x.done } : x)));
    await fetch(`/api/spaces/${space.id}/objectives/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !o.done }),
    });
  }

  async function deleteObjective(id: string) {
    setObjectives((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/spaces/${space.id}/objectives/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-8">
      {/* cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {space.book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={space.book.cover} alt="" className="h-24 w-16 shrink-0 rounded-md object-cover shadow-[var(--shadow-calm)]" />
          ) : (
            <span className="grid h-24 w-16 shrink-0 place-items-center rounded-md bg-[var(--color-line)] text-[var(--color-ink-soft)]">
              <BookOpen className="size-6" />
            </span>
          )}
          <div>
            <h1 className="font-serif text-3xl tracking-tight">{space.name}</h1>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              {space.book.title}
              {space.book.author ? ` · ${space.book.author}` : ""}
            </p>
            {space.description && <p className="mt-2 max-w-xl text-sm">{space.description}</p>}
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-block rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent)]">
                Você é {ROLE_LABEL[space.myRole]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[11px] text-[var(--color-ink-soft)]">
                {visibility === "PUBLIC" ? <Globe className="size-3" /> : <Lock className="size-3" />}
                {visibility === "PUBLIC" ? "Público" : "Privado"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/espaco/${space.id}/artefatos`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-line)]/40"
          >
            <FileText className="size-4" /> Artefatos
          </Link>
          {space.book.userBookId && (
            <Link
              href={`/read/${space.book.userBookId}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <BookOpen className="size-4" /> Abrir leitor
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* membros + progresso coletivo */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4" /> Membros ({space.members.length})
          </h2>
          <ul className="space-y-2">
            {space.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-sm font-medium text-[var(--color-accent)]">
                  {(m.name || m.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name || m.email}
                    {m.userId === myUserId && <span className="text-[var(--color-ink-soft)]"> (você)</span>}
                  </p>
                  {m.progress !== null ? (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--color-line)]">
                        <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.round(m.progress * 100)}%` }} />
                      </div>
                      <span className="text-[11px] tabular-nums text-[var(--color-ink-soft)]">{Math.round(m.progress * 100)}%</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--color-ink-soft)]">Progresso não compartilhado</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[10px] text-[var(--color-ink-soft)]">
                  {ROLE_LABEL[m.role]}
                </span>
                {manage && m.role !== "OWNER" && m.userId !== myUserId && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="shrink-0 text-[var(--color-ink-soft)] transition-colors hover:text-red-500"
                    title="Remover"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm text-[var(--color-ink-soft)]">
            <input type="checkbox" checked={shareProgress} onChange={toggleShare} className="accent-[var(--color-accent)]" />
            Compartilhar meu progresso de leitura com o espaço
          </label>
        </section>

        {/* lateral: convites + objetivos + ações */}
        <div className="space-y-8">
          {manage && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="size-4" /> Convidar
              </h2>
              <button
                onClick={genInvite}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-sm transition-colors hover:bg-[var(--color-line)]/40"
              >
                <Plus className="size-4" /> Gerar link de convite
              </button>
              {invites.map((inv) => (
                <InviteRow key={inv.code} code={inv.code} />
              ))}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Target className="size-4" /> Objetivos do grupo
            </h2>
            <ObjectiveComposer onAdd={addObjective} />
            {objectives.length === 0 ? (
              <p className="text-xs text-[var(--color-ink-soft)]">Nenhum objetivo ainda.</p>
            ) : (
              <ul className="space-y-1.5">
                {objectives.map((o) => (
                  <li key={o.id} className="group flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={o.done} onChange={() => toggleObjective(o)} className="accent-[var(--color-accent)]" />
                    <span className={o.done ? "text-[var(--color-ink-soft)] line-through" : ""}>{o.text}</span>
                    <button
                      onClick={() => deleteObjective(o.id)}
                      className="ml-auto text-[var(--color-ink-soft)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isOwner && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Globe className="size-4" /> Visibilidade
              </h2>
              <div className="flex rounded-full border border-[var(--color-line)] p-0.5 text-xs">
                {(["PRIVATE", "PUBLIC"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSpaceVisibility(v)}
                    className={[
                      "flex-1 rounded-full px-3 py-1 transition-colors",
                      visibility === v ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
                    ].join(" ")}
                  >
                    {v === "PRIVATE" ? "Privado (por convite)" : "Público (descobrível)"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--color-ink-soft)]">
                Público deixa o espaço aparecer na descoberta e qualquer um pode entrar. Não muda a
                visibilidade do conteúdo — cada contribuição só vira pública se o autor escolher.
              </p>
            </section>
          )}

          <section className="border-t border-[var(--color-line)] pt-4">
            {isOwner ? (
              <button onClick={removeSpace} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] transition-colors hover:text-red-500">
                <Trash2 className="size-4" /> Excluir espaço
              </button>
            ) : (
              <button onClick={leave} className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] transition-colors hover:text-red-500">
                <LogOut className="size-4" /> Sair do espaço
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function InviteRow({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/espaco/entrar/${code}` : `/espaco/entrar/${code}`;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-2">
      <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-ink-soft)]">{url}</span>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-[var(--color-line)]/60"
        title="Copiar link"
      >
        {copied ? <Check className="size-4 text-[var(--color-accent)]" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

function ObjectiveComposer({ onAdd }: { onAdd: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        setText("");
        await onAdd(t);
      }}
      className="flex items-center gap-2"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Adicionar objetivo…"
        className="min-w-0 flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      <button type="submit" className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-white transition-opacity hover:opacity-90">
        <Plus className="size-4" />
      </button>
    </form>
  );
}
