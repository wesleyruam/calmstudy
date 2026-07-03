import { getGraph } from "@/lib/concepts";
import { GraphView } from "@/components/graph-view";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const data = await getGraph();
  return <GraphView data={data} />;
}
