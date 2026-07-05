"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useDialog } from "@/components/dialog-provider";

async function uploadFiles(files: FileList | File[]): Promise<void> {
  const form = new FormData();
  for (const f of Array.from(files)) form.append("file", f);
  const res = await fetch("/api/books", { method: "POST", body: form });
  if (!res.ok && res.status !== 201) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Falha no upload.");
  }
}

/** Botão que abre o seletor de arquivos e envia. */
export function UploadButton({
  label = "Importar documento",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "ghost";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);

  const onPick = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setBusy(true);
      try {
        await uploadFiles(files);
        router.refresh();
      } catch (e) {
        await dialog.alert({
          title: "Falha no upload",
          message: e instanceof Error ? e.message : "Tente novamente.",
        });
      } finally {
        setBusy(false);
      }
    },
    [router, dialog],
  );

  const cls =
    variant === "primary"
      ? "rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      : "rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60";

  return (
    <>
      <button className={cls} disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Enviando…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept=".pdf,.epub,.mobi,.cbz,.cbr,.txt,.md,.markdown,.docx,.html,.htm"
        onChange={(e) => onPick(e.target.files)}
      />
    </>
  );
}

/** Overlay de arrastar-e-soltar na página inteira. */
export function DropOverlay() {
  const router = useRouter();
  const dialog = useDialog();
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      depth.current++;
      setOver(true);
    };
    const onLeave = () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      const files = e.dataTransfer?.files;
      if (files?.length) {
        try {
          await uploadFiles(files);
          router.refresh();
        } catch (err) {
          await dialog.alert({
            title: "Falha no upload",
            message: err instanceof Error ? err.message : "Tente novamente.",
          });
        }
      }
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [router, dialog]);

  if (!over) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--color-paper)]/60 backdrop-blur-md">
      <div className="rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-accent)] bg-[var(--color-surface)] px-16 py-12 text-center shadow-[var(--shadow-calm)]">
        <Download className="mx-auto size-8 text-[var(--color-accent)]" />
        <p className="mt-3 font-serif text-lg">Solte para importar</p>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">PDF, EPUB e outros formatos</p>
      </div>
    </div>
  );
}
