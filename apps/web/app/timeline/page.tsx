import { getTimeline } from "@/lib/timeline";
import { TimelineView } from "@/components/timeline-view";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const days = await getTimeline();
  return <TimelineView days={days} />;
}
