import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { SpaceHome } from "@/components/space-home";
import { currentUser } from "@/lib/study";
import { getSpaceDetail } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export default async function EspacoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const space = await getSpaceDetail(id, user.id);
  if (!space) notFound();

  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar activeFilter="none" />
        <main className="flex-1 px-6 py-10 md:px-10">
          <SpaceHome space={space} myUserId={user.id} />
        </main>
      </div>
    </div>
  );
}
