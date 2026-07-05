import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@calmstudy/db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { SpaceArtifacts } from "@/components/space-artifacts";
import { currentUser } from "@/lib/study";
import { listArtifacts } from "@/lib/artifacts";

export const dynamic = "force-dynamic";

export default async function ArtefatosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const artifacts = await listArtifacts(id, user.id);
  if (artifacts === null) notFound();
  const space = await prisma.studySpace.findUnique({ where: { id }, select: { name: true } });

  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar activeFilter="none" />
        <main className="flex-1 px-6 py-10 md:px-10">
          <Link
            href={`/espaco/${id}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
          >
            <ArrowLeft className="size-4" /> {space?.name ?? "Espaço"}
          </Link>
          <h1 className="font-serif text-3xl tracking-tight">Artefatos colaborativos</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-soft)]">
            Construídos em conjunto pelos membros. Qualquer um edita; cada versão fica no histórico.
          </p>
          <div className="mt-8">
            <SpaceArtifacts spaceId={id} initial={artifacts} />
          </div>
        </main>
      </div>
    </div>
  );
}
