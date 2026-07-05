import Link from "next/link";
import { Users, BookOpen } from "lucide-react";
import { JoinSpace } from "@/components/join-space";
import { getInvitePreview } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export default async function EntrarEspacoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const preview = await getInvitePreview(code);

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-paper)] px-4">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Users className="size-6" />
        </span>
        {preview ? (
          <>
            <h1 className="font-serif text-2xl tracking-tight">{preview.spaceName}</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-[var(--color-ink-soft)]">
              <BookOpen className="size-4" /> {preview.bookTitle}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
              {preview.memberCount} {preview.memberCount === 1 ? "membro" : "membros"}
            </p>
            <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
              Ao entrar, o livro do espaço fica disponível na sua biblioteca. Suas anotações continuam privadas.
            </p>
            <div className="mt-5">
              <JoinSpace code={code} />
            </div>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl tracking-tight">Convite inválido</h1>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              Este link de convite não existe ou expirou.
            </p>
            <Link href="/espacos" className="mt-5 inline-block text-sm text-[var(--color-accent)] hover:underline">
              Ver meus espaços
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
