"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Diálogos calmos que substituem window.prompt/confirm nativos.
// API imperativa: const dialog = useDialog(); await dialog.prompt({...}).

type PromptOptions = {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type DialogApi = {
  prompt: (opts: PromptOptions) => Promise<string | null>;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

type PromptState = PromptOptions & { kind: "prompt"; resolve: (v: string | null) => void };
type ConfirmState = ConfirmOptions & { kind: "confirm"; resolve: (v: boolean) => void };
type DialogState = PromptState | ConfirmState;

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog precisa estar dentro de <DialogProvider>.");
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => setState({ ...opts, kind: "prompt", resolve })),
    [],
  );
  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ ...opts, kind: "confirm", resolve })),
    [],
  );

  const close = useCallback(() => setState(null), []);

  return (
    <DialogContext.Provider value={{ prompt, confirm }}>
      {children}
      {state && <DialogHost state={state} close={close} />}
    </DialogContext.Provider>
  );
}

function DialogHost({ state, close }: { state: DialogState; close: () => void }) {
  const [value, setValue] = useState(state.kind === "prompt" ? state.defaultValue ?? "" : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const cancel = useCallback(() => {
    if (state.kind === "prompt") state.resolve(null);
    else state.resolve(false);
    close();
  }, [state, close]);

  const confirmAction = useCallback(() => {
    if (state.kind === "prompt") state.resolve(value.trim() ? value.trim() : null);
    else state.resolve(true);
    close();
  }, [state, value, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancel]);

  const danger = state.kind === "confirm" && state.danger;
  const confirmLabel = state.confirmLabel ?? (state.kind === "prompt" ? "Salvar" : "Confirmar");
  const cancelLabel = state.cancelLabel ?? "Cancelar";

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={state.title}
        className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-calm)] [animation:calm-dialog-in_.15s_ease-out]"
      >
        <h2 className="font-serif text-lg tracking-tight text-[var(--color-ink)]">{state.title}</h2>
        {state.message && (
          <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">{state.message}</p>
        )}

        {state.kind === "prompt" && (
          <label className="mt-4 block">
            {state.label && (
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">
                {state.label}
              </span>
            )}
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={state.placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmAction();
                }
              }}
              className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={cancel}
            className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={confirmAction}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${
              danger ? "bg-red-500" : "bg-[var(--color-accent)]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`@keyframes calm-dialog-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>,
    document.body,
  );
}
