import { notFound } from "next/navigation";
import { getConceptDetail, getConcepts } from "@/lib/concepts";
import { getBooksBrief } from "@/lib/knowledge";
import { ConceptView } from "@/components/concept-view";

export const dynamic = "force-dynamic";

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [concept, concepts, books] = await Promise.all([
    getConceptDetail(id),
    getConcepts(),
    getBooksBrief(),
  ]);
  if (!concept) notFound();
  return (
    <ConceptView
      concept={concept}
      allConcepts={concepts.map((c) => ({ id: c.id, title: c.title }))}
      allBooks={books}
    />
  );
}
