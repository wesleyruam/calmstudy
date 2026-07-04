"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ArrowLeft } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { NoteDTO, TiptapDoc } from "@/lib/note-shared";

// Editor livre (módulo 5): página solta (nota isFreePage) com autosave.
export function FreePageView({ note }: { note: NoteDTO }) {
  const router = useRouter();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function save(body: Record<string, unknown>) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }, 700);
  }

  async function remove() {
    if (!window.confirm("Excluir esta página?")) return;
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    if (res.ok) router.push("/conhecimento");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/conhecimento"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
        >
          <ArrowLeft className="size-4" /> Conhecimento
        </Link>
        <button
          onClick={remove}
          className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/60 hover:text-red-500"
          title="Excluir"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <input
        defaultValue={note.title ?? ""}
        onChange={(e) => save({ title: e.target.value || null })}
        placeholder="Título da página"
        className="w-full bg-transparent font-serif text-3xl outline-none"
      />

      <div className="mt-4">
        <RichTextEditor
          initialContent={note.content}
          onChange={(doc: TiptapDoc, text: string) => save({ content: doc, contentText: text })}
        />
      </div>
    </div>
  );
}
