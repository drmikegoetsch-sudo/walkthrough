import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WalkSession } from "./WalkSession";

type Params = { id: string };
type Search = { session?: string };

export default async function WalkPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const { session: sessionParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: facility } = await supabase
    .from("facilities")
    .select("id, name, floor_plan_url, floor_plan_width, floor_plan_height")
    .eq("id", id)
    .maybeSingle();
  if (!facility) notFound();

  const { data: waypoints } = await supabase
    .from("waypoints")
    .select("id, label, x, y, sequence_order")
    .eq("facility_id", id)
    .order("sequence_order");

  if (!waypoints || waypoints.length === 0) {
    return (
      <main className="min-h-screen bg-ink text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-base font-medium mb-1">No waypoints yet</div>
          <div className="text-sm text-white/50">
            Add some in the editor before walking.
          </div>
        </div>
      </main>
    );
  }

  // Most-recent photo per waypoint from prior completed sessions (for ghost overlay).
  const { data: referenceRows } = await supabase
    .from("photos")
    .select("waypoint_id, public_url, captured_at, walk_sessions!inner(status)")
    .eq("facility_id", id)
    .eq("walk_sessions.status", "completed")
    .order("captured_at", { ascending: false });

  const referencePhotoUrls: Record<string, string> = {};
  for (const row of referenceRows ?? []) {
    const wid = (row as { waypoint_id: string | null }).waypoint_id;
    const url = (row as { public_url: string | null }).public_url;
    if (wid && url && !referencePhotoUrls[wid]) {
      referencePhotoUrls[wid] = url;
    }
  }

  let resumeSessionId: string | null = null;
  let completedWaypointIds: string[] = [];

  if (sessionParam) {
    const { data: existing } = await supabase
      .from("walk_sessions")
      .select("id, status")
      .eq("id", sessionParam)
      .eq("facility_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && existing.status === "in_progress") {
      resumeSessionId = existing.id;
      const { data: photos } = await supabase
        .from("photos")
        .select("waypoint_id")
        .eq("session_id", existing.id);
      completedWaypointIds =
        photos?.map((p) => p.waypoint_id).filter((w): w is string => !!w) ?? [];
    }
  }

  return (
    <WalkSession
      facility={{
        id: facility.id,
        name: facility.name,
        floorPlanUrl: facility.floor_plan_url,
        floorPlanWidth: facility.floor_plan_width,
        floorPlanHeight: facility.floor_plan_height,
      }}
      waypoints={waypoints}
      referencePhotoUrls={referencePhotoUrls}
      initialSessionId={resumeSessionId}
      initialCompletedWaypointIds={completedWaypointIds}
    />
  );
}
