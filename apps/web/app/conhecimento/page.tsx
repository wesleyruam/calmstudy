import { getKnowledge } from "@/lib/knowledge";
import { KnowledgeView } from "@/components/knowledge-view";

export const dynamic = "force-dynamic";

export default async function ConhecimentoPage() {
  const data = await getKnowledge();
  return <KnowledgeView data={data} />;
}
