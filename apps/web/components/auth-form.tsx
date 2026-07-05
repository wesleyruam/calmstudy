"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { BookOpen, Loader2 } from "lucide-react";

// Formulário de login/cadastro (Fase 0). Cadastro reivindica conta sem senha,
// preservando a biblioteca já existente (ex.: usuário padrão migrado).
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    if (isRegister) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, email, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Não foi possível criar a conta.");
        setBusy(false);
        return;
      }
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError(isRegister ? "Conta criada, mas o login falhou." : "E-mail ou senha incorretos.");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-paper)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <BookOpen className="size-6" />
          </span>
          <h1 className="font-serif text-2xl tracking-tight">CalmStudy</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            {isRegister ? "Crie sua conta para começar a estudar." : "Entre para continuar seus estudos."}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-calm)]"
        >
          {isRegister && (
            <Field label="Nome">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Como quer ser chamado"
                className="input"
              />
            </Field>
          )}
          <Field label="E-mail">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="voce@exemplo.com"
              className="input"
            />
          </Field>
          <Field label="Senha">
            <input
              type="password"
              required
              minLength={isRegister ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "Mínimo 8 caracteres" : "Sua senha"}
              className="input"
            />
          </Field>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {isRegister ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--color-ink-soft)]">
          {isRegister ? (
            <>
              Já tem conta?{" "}
              <Link href="/entrar" className="text-[var(--color-accent)] hover:underline">
                Entrar
              </Link>
            </>
          ) : (
            <>
              Não tem conta?{" "}
              <Link href="/criar-conta" className="text-[var(--color-accent)] hover:underline">
                Criar conta
              </Link>
            </>
          )}
        </p>
      </div>

      <style>{`.input{width:100%;border-radius:0.6rem;border:1px solid var(--color-line);background:var(--color-paper);padding:0.55rem 0.75rem;font-size:0.9rem;outline:none}.input:focus{border-color:var(--color-accent)}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">{label}</span>
      {children}
    </label>
  );
}
