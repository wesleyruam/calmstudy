import Link from "next/link";
import { Users } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { CreateSpace } from "@/components/create-space";
import { currentUser } from "@/lib/study";
import { getMySpaces, myBooksForPicker } from "@/lib/spaces";
import { ROLE_LABEL } from "@/lib/space-shared";

export const dynamic = "force-dynamic";

export default async function EspacosPage() {
  const user = await currentUser();
  const [spaces, books] = await Promise.all([getMySpaces(user.id), myBooksForPicker(user.id)]);

  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar activeFilter="none" />
        <main className="flex-1 px-6 py-10 md:px-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl tracking-tight">Espaços de Estudo</h1>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                Estude o mesmo material em grupo — dúvidas, resumos e conceitos no contexto do livro.
              </p>
            </div>
            <CreateSpace books={books} />
          </div>

          {spaces.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] py-16 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <Users className="size-6" />
              </span>
              <p className="mt-4 font-medium">Nenhum espaço ainda</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-soft)]">
                Crie um espaço a partir de um livro seu e convide pessoas, ou entre por um link de convite.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spaces.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/espaco/${s.id}`}
                    className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-calm)] transition-colors hover:border-[var(--color-accent)]"
                  >
                    <div className="flex items-start gap-3">
                      {s.bookCover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.bookCover} alt="" className="h-16 w-12 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="grid h-16 w-12 shrink-0 place-items-center rounded bg-[var(--color-line)] text-[var(--color-ink-soft)]">
                          <Users className="size-5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="truncate text-xs text-[var(--color-ink-soft)]">{s.bookTitle}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
                      <Users className="size-3.5" />
                      {s.memberCount} {s.memberCount === 1 ? "membro" : "membros"}
                      <span className="ml-auto rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                        {ROLE_LABEL[s.myRole]}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
