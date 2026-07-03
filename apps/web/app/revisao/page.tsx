import { getReviewData } from "@/lib/review";
import { ReviewView } from "@/components/review-view";

export const dynamic = "force-dynamic";

export default async function RevisaoPage() {
  const data = await getReviewData();
  return <ReviewView data={data} />;
}
