"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, CircleDot, Pause, Lock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export type ReviewStatus = "in_review" | "paused" | "closed";

const OPTIONS: {
  value: ReviewStatus;
  label: string;
  icon: typeof CircleDot;
  tone: string;
  pill: string;
}[] = [
  {
    value: "in_review",
    label: "In review",
    icon: CircleDot,
    tone: "text-accent",
    pill: "bg-accent-pale text-accent",
  },
  {
    value: "paused",
    label: "Paused",
    icon: Pause,
    tone: "text-ink-2",
    pill: "bg-surface-2 text-ink-2 border border-surface-3",
  },
  {
    value: "closed",
    label: "Closed",
    icon: Lock,
    tone: "text-success",
    pill: "bg-success-pale text-success",
  },
];

type Size = "sm" | "md";

type Props = {
  sessionId: string;
  status: ReviewStatus;
  size?: Size;
};

export function ReviewStatusSelect({ sessionId, status, size = "md" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ReviewStatus>(status);
  const [pending, setPending] = useState<ReviewStatus | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCurrent(status), [status]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function pick(value: ReviewStatus) {
    setOpen(false);
    if (value === current) return;
    const previous = current;
    setCurrent(value);
    setPending(value);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("walk_sessions")
        .update({ review_status: value })
        .eq("id", sessionId);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      setCurrent(previous);
      const message = err instanceof Error ? err.message : "Update failed";
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  const currentOption =
    OPTIONS.find((o) => o.value === current) ?? OPTIONS[0];
  const Icon = currentOption.icon;

  const isSm = size === "sm";

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={pending !== null}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors disabled:opacity-60",
          isSm ? "text-[11px] px-2.5 py-0.5" : "text-xs px-3 py-1",
          currentOption.pill,
        )}
      >
        <Icon size={isSm ? 10 : 12} />
        {currentOption.label}
        <ChevronDown size={isSm ? 10 : 12} className="opacity-70" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-surface-3 rounded-[var(--radius-sm)] shadow-[var(--shadow-md)] z-20 py-1">
          {OPTIONS.map((o) => {
            const OIcon = o.icon;
            const isActive = o.value === current;
            return (
              <button
                key={o.value}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pick(o.value);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-surface-2 transition-colors"
              >
                <OIcon size={12} className={o.tone} />
                <span className="flex-1 text-ink">{o.label}</span>
                {isActive ? (
                  <Check size={12} className="text-ink-3" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
