"use client";

import { useCallback, useState } from "react";
import { Plus, Pencil, Trash2, History, X, Loader2 } from "lucide-react";
import {
  ARTIFACT_META,
  ARTIFACT_TYPES,
  type ArtifactDTO,
  type ArtifactRevisionDTO,
  type ArtifactType,
} from "@/lib/artifact-shared";

export function SpaceArtifacts({ spaceId, initial }: { spaceId: string; initial: ArtifactDTO[] }) {
  const [items, setItems] = useState<ArtifactDTO[]>(initial);

  const reload = useCallback(() => {
    fetch(`/api/spaces/${spaceId}/artifacts`)
      .then((r) => (r.ok ? r.json() : { artifacts: items }))
      .then((d) => setItems(d.artifacts ?? []))
      .catch(() => {});
  }, [spaceId, items]);

  return (
    <div className="space-y-10">
      {ARTIFACT_TYPES.map((type) => (
        <Group key={type} type={type} items={items.filter((a) => a.type === type)} spaceId={spaceId} onChange={reload} />
      ))}
    </div>
  );
}

function Group({
  type,
  items,
  spaceId,
  onChange,
}: {
  type: ArtifactType;
  items: ArtifactDTO[];
  spaceId: string;
  onChange: () => void;
}) {
  const meta = ARTIFACT_META[type];
  const [adding, setAdding] = useState(false);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">{meta.group}</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-xs text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/40"
        >
          <Plus className="size-3.5" /> Adicionar
        </button>
      </div>

      {adding && (
        <div className="mb-3">
          <Editor
            type={type}
            onCancel={() => setAdding(false)}
            onSave={async (title, body) => {
              const res = await fetch(`/api/spaces/${spaceId}/artifacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, title, contentText: body }),
              });
              if (res.ok) { setAdding(false); onChange(); }
            }}
          />
        </div>
      )}

      {items.length === 0 && !adding ? (
        <p className="text-xs text-[var(--color-ink-soft)]">Nada aqui ainda.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((a) => (
            <ArtifactCard key={a.id} a={a} spaceId={spaceId} onChange={onChange} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ArtifactCard({ a, spaceId, onChange }: { a: ArtifactDTO; spaceId: string; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<ArtifactRevisionDTO[] | null>(null);

  async function remove() {
    if (!confirm(`Excluir "${a.title}"?`)) return;
    const res = await fetch(`/api/spaces/${spaceId}/artifacts/${a.id}`, { method: "DELETE" });
    if (res.ok) onChange();
  }

  async function openHistory() {
    const res = await fetch(`/api/spaces/${spaceId}/artifacts/${a.id}/revisions`);
    if (res.ok) setHistory((await res.json()).revisions ?? []);
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-[var(--color-line)] p-3">
        <Editor
          type={a.type}
          initialTitle={a.title}
          initialBody={a.contentText}
          onCancel={() => setEditing(false)}
          onSave={async (title, body) => {
            const res = await fetch(`/api/spaces/${spaceId}/artifacts/${a.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, contentText: body }),
            });
            if (res.ok) { setEditing(false); onChange(); }
          }}
        />
      </li>
    );
  }

  return (
    <li className="group flex flex-col rounded-xl border border-[var(--color-line)] p-3">
      <p className="font-medium">{a.title}</p>
      <p className="mt-1 flex-1 whitespace-pre-wrap text-sm text-[var(--color-ink-soft)]">{a.contentText}</p>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--color-ink-soft)]">
        <span>editado por {a.updatedByName || "alguém"} · {when(a.updatedAt)}</span>
        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={openHistory} title={`Histórico (${a.revisionCount})`} className="grid size-6 place-items-center rounded-full hover:bg-[var(--color-line)]/60">
            <History className="size-3.5" />
          </button>
          <button onClick={() => setEditing(true)} title="Editar" className="grid size-6 place-items-center rounded-full hover:bg-[var(--color-line)]/60">
            <Pencil className="size-3.5" />
          </button>
          {a.canDelete && (
            <button onClick={remove} title="Excluir" className="grid size-6 place-items-center rounded-full hover:text-red-500">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {history && <HistoryModal title={a.title} revisions={history} onClose={() => setHistory(null)} />}
    </li>
  );
}

function Editor({
  type,
  initialTitle = "",
  initialBody = "",
  onSave,
  onCancel,
}: {
  type: ArtifactType;
  initialTitle?: string;
  initialBody?: string;
  onSave: (title: string, body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const meta = ARTIFACT_META[type];
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !body.trim() || busy) return;
    setBusy(true);
    await onSave(title.trim(), body.trim());
    setBusy(false);
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-[var(--color-line)] p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={meta.titlePlaceholder}
        autoFocus
        className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-1.5 text-sm font-medium outline-none focus:border-[var(--color-accent)]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={meta.bodyPlaceholder}
        className="max-h-64 min-h-[4rem] w-full resize-y rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full px-3 py-1 text-xs text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/50">
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={!title.trim() || !body.trim() || busy}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />} Salvar
        </button>
      </div>
    </div>
  );
}

function HistoryModal({ title, revisions, onClose }: { title: string; revisions: ArtifactRevisionDTO[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-calm)]">
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
          <History className="size-4 text-[var(--color-ink-soft)]" />
          <span className="flex-1 truncate text-sm font-medium">Histórico · {title}</span>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60"><X className="size-4" /></button>
        </div>
        <ul className="space-y-3 overflow-y-auto p-4">
          {revisions.map((r, i) => (
            <li key={r.id} className="rounded-xl border border-[var(--color-line)] p-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--color-ink-soft)]">
                <span>{r.editorName || "alguém"} · {when(r.editedAt)}</span>
                {i === 0 && <span className="rounded-full bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">atual</span>}
              </div>
              <p className="text-sm font-medium">{r.title}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--color-ink-soft)]">{r.contentText}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function when(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Hoje, ${time}` : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
