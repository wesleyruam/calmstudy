import { notFound } from "next/navigation";
import { PdfReader } from "@/components/pdf-reader";
import { getReaderData } from "@/lib/reader";

export const dynamic = "force-dynamic";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ userBookId: string }>;
}) {
  const { userBookId } = await params;
  const data = await getReaderData(userBookId);
  if (!data) notFound();

  // Fase 1: leitor de PDF. EPUB/CBZ ganham seus leitores na Fase 4.
  if (data.format !== "PDF") {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-serif text-xl">Leitor de {data.format} em breve</p>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
            Por enquanto o CalmBook abre PDFs. Volte para a{" "}
            <a href="/" className="text-[var(--color-accent)] underline">
              biblioteca
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return <PdfReader data={data} />;
}
