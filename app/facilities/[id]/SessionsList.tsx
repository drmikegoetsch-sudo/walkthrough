import Link from "next/link";
import { CheckCircle2, CircleDot, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ReviewStatusSelect, type ReviewStatus } from "./ReviewStatusSelect";

type Session = {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed";
  review_status: ReviewStatus;
  photo_count: number;
};

type Props = {
  facilityId: string;
  sessions: Session[];
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function SessionsList({ facilityId, sessions }: Props) {
  return (
    <div className="bg-white border border-surface-3 rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Walkthroughs</span>
          <span className="text-[11px] text-ink-3 font-mono mt-0.5">
            {sessions.length} total
          </span>
        </div>
        <Link href={`/facilities/${facilityId}/walk`}>
          <Button variant="accent">
            <Play size={12} />
            Start walkthrough
          </Button>
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="p-6 text-center text-xs text-ink-3">
          No walkthroughs yet. Start one to begin capturing photos.
        </div>
      ) : (
        <div className="flex flex-col">
          {sessions.map((s) => {
            const isCompleted = s.status === "completed";
            const timestamp = isCompleted && s.completed_at ? s.completed_at : s.started_at;
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-surface-2 last:border-b-0"
              >
                <div
                  className={
                    isCompleted
                      ? "text-success flex-shrink-0"
                      : "text-active flex-shrink-0"
                  }
                >
                  {isCompleted ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <CircleDot size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {dateTimeFormatter.format(new Date(timestamp))}
                  </div>
                  <div className="text-[11px] text-ink-3 font-mono mt-0.5">
                    {isCompleted ? "Completed" : "In progress"} · {s.photo_count}{" "}
                    photo{s.photo_count === 1 ? "" : "s"}
                  </div>
                </div>
                {isCompleted ? (
                  <ReviewStatusSelect
                    sessionId={s.id}
                    status={s.review_status}
                    size="sm"
                  />
                ) : null}
                <div className="flex gap-1.5 flex-shrink-0">
                  {isCompleted ? (
                    <Link href={`/facilities/${facilityId}/review?session=${s.id}`}>
                      <Button variant="ghost">Review</Button>
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/facilities/${facilityId}/walk?session=${s.id}`}
                      >
                        <Button variant="ghost">Resume</Button>
                      </Link>
                      <Link href={`/facilities/${facilityId}/review?session=${s.id}`}>
                        <Button variant="ghost">Review</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
