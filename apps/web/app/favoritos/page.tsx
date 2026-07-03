import { getFavorites } from "@/lib/favorites";
import { FavoritesView } from "@/components/favorites-view";

export const dynamic = "force-dynamic";

export default async function FavoritosPage() {
  const data = await getFavorites();
  return <FavoritesView data={data} />;
}
