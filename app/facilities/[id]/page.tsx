import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ResuggestButton } from "./ResuggestButton";
import { SessionsList } from "./SessionsList";
import { WaypointEditor } from "./WaypointEditor";

type Params = { id: string };

export default async function FacilityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: facility } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!facility) notFound();

  const { data: waypoints } = await supabase
    .from("waypoints")
    .select("id, label, x, y, sequence_order, ai_suggested")
    .eq("facility_id", id)
    .order("sequence_order");

  // Try with review_status first; fall back without it if the migration
  // (0004_review_status.sql) hasn't been applied yet. Otherwise a missing
  // column makes the whole query error and the UI shows "0 total".
  let sessionRows:
    | Array<{
        id: string;
        started_at: string;
        completed_at: string | null;
        status: string;
        review_status?: string | null;
        photos: { count: number }[] | null;
      }>
    | null = null;

  const withReviewStatus = await supabase
    .from("walk_sessions")
    .select(
      "id, started_at, completed_at, status, review_status, photos(count)",
    )
    .eq("facility_id", id)
    .order("started_at", { ascending: false });

  if (withReviewStatus.error) {
    const fallback = await supabase
      .from("walk_sessions")
      .select("id, started_at, completed_at, status, photos(count)")
      .eq("facility_id", id)
      .order("started_at", { ascending: false });
    sessionRows = fallback.data;
  } else {
    sessionRows = withReviewStatus.data;
  }

  const sessions = (sessionRows ?? []).map((s) => ({
    id: s.id,
    started_at: s.started_at,
    completed_at: s.completed_at,
    status: s.status as "in_progress" | "completed",
    review_status: (s.review_status ?? "in_review") as
      | "in_review"
      | "paused"
      | "closed",
    photo_count: s.photos?.[0]?.count ?? 0,
  }));

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 py-6 md:py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="w-7 h-7 border border-surface-3 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink-2 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={14} />
        </Link>
        <div className="flex-1">
          <div className="text-[17px] font-medium tracking-[-0.02em]">
            {facility.name}
          </div>
          {facility.address ? (
            <div className="text-xs text-ink-3">{facility.address}</div>
          ) : null}
        </div>
        <ResuggestButton facilityId={facility.id} />
      </div>

      <WaypointEditor
        facilityId={facility.id}
        floorPlanUrl={facility.floor_plan_url}
        initialWaypoints={waypoints ?? []}
      />

      <div className="mt-6">
        <SessionsList facilityId={facility.id} sessions={sessions} />
      </div>
    </main>
  );
}
