import { notFound } from "next/navigation";
import { getFreePage } from "@/lib/knowledge";
import { FreePageView } from "@/components/free-page-view";

export const dynamic = "force-dynamic";

export default async function FreePagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getFreePage(id);
  if (!note) notFound();
  return <FreePageView note={note} />;
}
