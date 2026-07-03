import { getStats } from "@/lib/stats";
import { StatsView } from "@/components/stats-view";

export const dynamic = "force-dynamic";

export default async function EstatisticasPage() {
  const data = await getStats();
  return <StatsView data={data} />;
}
