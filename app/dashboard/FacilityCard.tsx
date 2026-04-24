import Link from "next/link";
import { CheckCircle2, Camera, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FacilityMenu } from "./FacilityMenu";

type CompletedSession = {
  id: string;
  completed_at: string;
  photo_count: number;
};

type Props = {
  id: string;
  name: string;
  address: string | null;
  floorPlanUrl: string | null;
  waypointCount: number;
  completedSessions: CompletedSession[];
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const MAX_VISIBLE = 3;

export function FacilityCard({
  id,
  name,
  address,
  floorPlanUrl,
  waypointCount,
  completedSessions,
}: Props) {
  const visible = completedSessions.slice(0, MAX_VISIBLE);
  const extra = completedSessions.length - visible.length;

  return (
    <div className="border-b border-surface-3 last:border-b-0 hover:bg-surface-2/40 transition-colors">
      <div className="px-5 py-4 flex items-center gap-4">
        <Link
          href={`/facilities/${id}`}
          className="flex items-center gap-3 flex-1 min-w-0 group/tile"
          aria-label={`Open ${name}`}
        >
          <div className="w-10 h-10 bg-surface-2 rounded-[var(--radius-sm)] flex-shrink-0 overflow-hidden border border-surface-3">
            {floorPlanUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={floorPlanUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate group-hover/tile:text-accent transition-colors">
              {name}
            </div>
            <div className="text-xs text-ink-3 mt-0.5 truncate">
              {waypointCount} waypoint{waypointCount === 1 ? "" : "s"}
              {address ? ` · ${address}` : ""}
            </div>
          </div>
        </Link>

        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <span
            className={
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
              (completedSessions.length > 0
                ? "bg-success-pale text-success"
                : "bg-surface-2 text-ink-3")
            }
          >
            {completedSessions.length} walkthrough
            {completedSessions.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link href={`/facilities/${id}/walk`}>
            <Button variant="accent">
              <Play size={12} />
              Start walkthrough
            </Button>
          </Link>
          <FacilityMenu facilityId={id} facilityName={name} />
        </div>
      </div>

      {completedSessions.length > 0 ? (
        <div className="px-5 pb-3 -mt-1">
          <div className="flex items-center justify-between mb-1.5 pl-[56px]">
            <span className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-mono">
              Completed walkthroughs
            </span>
            {extra > 0 ? (
              <Link
                href={`/facilities/${id}/review`}
                className="text-[10px] text-ink-3 hover:text-ink-2 font-mono"
              >
                +{extra} more →
              </Link>
            ) : null}
          </div>
          <ul className="pl-[56px] flex flex-col relative">
            <span
              aria-hidden
              className="absolute left-[50px] top-[14px] bottom-[14px] w-px bg-surface-3"
            />
            {visible.map((s) => {
              const d = new Date(s.completed_at);
              return (
                <li key={s.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute left-[-9px] top-[10px] w-1.5 h-1.5 rounded-full bg-success ring-2 ring-white"
                  />
                  <Link
                    href={`/facilities/${id}/review?session=${s.id}`}
                    className="group flex items-center gap-2 py-1 text-xs text-ink-2 hover:text-ink transition-colors"
                  >
                    <CheckCircle2
                      size={12}
                      className="text-success flex-shrink-0"
                    />
                    <span className="font-medium">
                      {dateFormatter.format(d)}
                    </span>
                    <span className="text-ink-3 font-mono text-[10px]">
                      {timeFormatter.format(d)}
                    </span>
                    <span className="text-ink-4">·</span>
                    <span className="text-ink-3 font-mono text-[10px] flex items-center gap-0.5">
                      <Camera size={10} />
                      {s.photo_count}
                    </span>
                    <span className="ml-auto text-[10px] font-medium text-accent group-hover:text-accent-2 transition-colors">
                      Review →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
