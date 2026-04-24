import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "./SignOutButton";
import { FacilityCard } from "./FacilityCard";

type FacilityRow = {
  id: string;
  name: string;
  address: string | null;
  floor_plan_url: string | null;
  created_at: string;
  waypoints: { count: number }[];
};

type SessionRow = {
  id: string;
  facility_id: string;
  completed_at: string | null;
  started_at: string;
  photos: { count: number }[];
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: facilities } = await supabase
    .from("facilities")
    .select("id, name, address, floor_plan_url, created_at, waypoints(count)")
    .order("created_at", { ascending: false })
    .returns<FacilityRow[]>();

  const { data: completedSessions } = await supabase
    .from("walk_sessions")
    .select("id, facility_id, completed_at, started_at, photos(count)")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .returns<SessionRow[]>();

  const sessionsByFacility = new Map<
    string,
    { id: string; completed_at: string; photo_count: number }[]
  >();
  for (const s of completedSessions ?? []) {
    if (!s.completed_at) continue;
    const list = sessionsByFacility.get(s.facility_id) ?? [];
    list.push({
      id: s.id,
      completed_at: s.completed_at,
      photo_count: s.photos?.[0]?.count ?? 0,
    });
    sessionsByFacility.set(s.facility_id, list);
  }

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-10">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <div className="text-[17px] font-medium tracking-[-0.02em]">Soter Walkthrough</div>
            <div className="text-xs text-ink-3 font-mono">{user?.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/devices"
            className="text-xs text-ink-2 hover:text-ink font-medium"
          >
            Devices
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="bg-white border border-surface-3 rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">Facilities</span>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent-pale text-accent text-[11px] font-semibold font-mono">
              {facilities?.length ?? 0}
            </span>
          </div>
          <Link href="/facilities/new">
            <Button variant="accent">+ Add Facility</Button>
          </Link>
        </div>

        <div className="flex flex-col">
          {facilities && facilities.length > 0 ? (
            facilities.map((f) => (
              <FacilityCard
                key={f.id}
                id={f.id}
                name={f.name}
                address={f.address}
                floorPlanUrl={f.floor_plan_url}
                waypointCount={f.waypoints?.[0]?.count ?? 0}
                completedSessions={sessionsByFacility.get(f.id) ?? []}
              />
            ))
          ) : (
            <div className="p-10 text-center">
              <div className="text-sm font-medium text-ink-2">No facilities yet</div>
              <div className="text-xs text-ink-3 mt-1">
                Upload a floor plan to get started.
              </div>
              <div className="mt-4">
                <Link href="/facilities/new">
                  <Button variant="accent">+ Add Facility</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
