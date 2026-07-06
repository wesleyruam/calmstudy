import { notFound } from "next/navigation";
import { PdfReader } from "@/components/pdf-reader";
import { EpubReader } from "@/components/epub-reader";
import { MobiReader } from "@/components/mobi-reader";
import { getReaderData } from "@/lib/reader";

export const dynamic = "force-dynamic";

export default async function ReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ userBookId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { userBookId } = await params;
  const { page } = await searchParams;
  const data = await getReaderData(userBookId);
  if (!data) notFound();

  // Deep-link do caderno: ?page=N abre o leitor direto nessa página.
  const jump = page ? parseInt(page, 10) : NaN;
  if (Number.isFinite(jump) && jump > 0) data.lastPage = jump;

  if (data.format === "EPUB") return <EpubReader data={data} />;
  if (data.format === "MOBI") return <MobiReader data={data} />;

  // PDF tem o leitor completo; EPUB/MOBI têm o leitor de leitura.
  // CBZ e afins ganham seus leitores depois.
  if (data.format !== "PDF") {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-serif text-xl">Leitor de {data.format} em breve</p>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
            Por enquanto o CalmStudy abre PDF e EPUB. Volte para a{" "}
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
