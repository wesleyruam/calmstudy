import { notFound } from "next/navigation";
import { getNotebook } from "@/lib/notebook";
import { NotebookView } from "@/components/notebook-view";

export const dynamic = "force-dynamic";

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ userBookId: string }>;
}) {
  const { userBookId } = await params;
  const data = await getNotebook(userBookId);
  if (!data) notFound();
  return <NotebookView data={data} />;
}
