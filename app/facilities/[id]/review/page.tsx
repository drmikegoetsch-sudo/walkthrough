import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReviewClient } from "./ReviewClient";
import { ReviewChat } from "./ReviewChat";
import { ReviewLayout } from "./ReviewLayout";

type Params = { id: string };

export default async function ReviewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: facility } = await supabase
    .from("facilities")
    .select(
      "id, name, address, floor_plan_url, floor_plan_width, floor_plan_height",
    )
    .eq("id", id)
    .maybeSingle();
  if (!facility) notFound();

  const { data: waypoints } = await supabase
    .from("waypoints")
    .select("id, label, x, y, sequence_order")
    .eq("facility_id", id)
    .order("sequence_order");

  const { data: photos } = await supabase
    .from("photos")
    .select("id, waypoint_id, session_id, public_url, captured_at")
    .eq("facility_id", id)
    .order("captured_at", { ascending: false });

  // Try with review_status, fall back without it if migration 0004 hasn't run.
  let sessionRows:
    | Array<{ id: string; started_at: string; review_status?: string | null }>
    | null = null;
  const withReviewStatus = await supabase
    .from("walk_sessions")
    .select("id, started_at, review_status")
    .eq("facility_id", id)
    .order("started_at", { ascending: false });
  if (withReviewStatus.error) {
    const fallback = await supabase
      .from("walk_sessions")
      .select("id, started_at")
      .eq("facility_id", id)
      .order("started_at", { ascending: false });
    sessionRows = fallback.data;
  } else {
    sessionRows = withReviewStatus.data;
  }

  const sessions = (sessionRows ?? []).map((s) => ({
    id: s.id,
    started_at: s.started_at,
    review_status: (s.review_status ?? "in_review") as
      | "in_review"
      | "paused"
      | "closed",
  }));

  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/dashboard"
          className="w-7 h-7 border border-surface-3 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink-2 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={14} />
        </Link>
        <div>
          <div className="text-[17px] font-medium tracking-[-0.02em]">
            {facility.name}
          </div>
          <div className="text-xs text-ink-3">Review</div>
        </div>
      </div>

      <ReviewLayout
        chat={<ReviewChat facilityName={facility.name} />}
        canvas={
          <ReviewClient
            floorPlanUrl={facility.floor_plan_url}
            floorPlanWidth={facility.floor_plan_width}
            floorPlanHeight={facility.floor_plan_height}
            waypoints={waypoints ?? []}
            photos={photos ?? []}
            sessions={sessions}
          />
        }
      />
    </main>
  );
}
