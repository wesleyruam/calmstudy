import { notFound } from "next/navigation";
import { getBookDashboard } from "@/lib/dashboard";
import { BookDashboard } from "@/components/book-dashboard";

export const dynamic = "force-dynamic";

export default async function LivroPage({
  params,
}: {
  params: Promise<{ userBookId: string }>;
}) {
  const { userBookId } = await params;
  const data = await getBookDashboard(userBookId);
  if (!data) notFound();
  return <BookDashboard data={data} />;
}
