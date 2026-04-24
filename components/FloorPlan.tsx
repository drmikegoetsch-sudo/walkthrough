"use client";

import { useRef, type PointerEvent, type MouseEvent } from "react";
import { cn } from "@/lib/cn";

export type FloorPlanWaypoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  sequence_order: number;
};

export type FloorPlanMode = "edit" | "view";

type Props = {
  floorPlanUrl: string;
  waypoints: FloorPlanWaypoint[];
  mode?: FloorPlanMode;
  selectedId?: string | null;
  onAdd?: (x: number, y: number) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onSelect?: (id: string | null) => void;
  dotState?: (waypoint: FloorPlanWaypoint) => "default" | "active" | "completed";
  className?: string;
};

export function FloorPlan({
  floorPlanUrl,
  waypoints,
  mode = "view",
  selectedId = null,
  onAdd,
  onMove,
  onSelect,
  dotState,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{
    id: string;
    pointerId: number;
    moved: boolean;
  } | null>(null);

  const sorted = [...waypoints].sort(
    (a, b) => a.sequence_order - b.sequence_order,
  );
  const pathPoints = sorted.map((w) => `${w.x * 100},${w.y * 100}`).join(" ");

  function toNormalized(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
    return { x, y };
  }

  function handleBackgroundClick(e: MouseEvent<HTMLDivElement>) {
    if (mode !== "edit" || !onAdd) return;
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.fpBg) {
      return;
    }
    const { x, y } = toNormalized(e.clientX, e.clientY);
    onAdd(x, y);
  }

  function handleDotPointerDown(w: FloorPlanWaypoint, e: PointerEvent) {
    if (mode !== "edit") return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { id: w.id, pointerId: e.pointerId, moved: false };
  }

  function handleDotPointerMove(e: PointerEvent) {
    const drag = draggingRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    drag.moved = true;
    const { x, y } = toNormalized(e.clientX, e.clientY);
    onMove?.(drag.id, x, y);
  }

  function handleDotPointerUp(w: FloorPlanWaypoint, e: PointerEvent) {
    const drag = draggingRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (!drag.moved) {
      onSelect?.(w.id === selectedId ? null : w.id);
    }
    draggingRef.current = null;
  }

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      className={cn(
        "relative bg-surface-2 select-none",
        mode === "edit" ? "cursor-crosshair" : "",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={floorPlanUrl}
        alt=""
        data-fp-bg="1"
        draggable={false}
        className="w-full block pointer-events-none"
      />
      {sorted.length > 1 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={pathPoints}
            fill="none"
            stroke="rgba(38,16,255,0.18)"
            strokeWidth="0.4"
            strokeDasharray="1.5,1.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {sorted.map((w) => {
        const state = dotState ? dotState(w) : "default";
        const isSelected = w.id === selectedId;
        return (
          <button
            key={w.id}
            type="button"
            title={w.label}
            onPointerDown={(e) => handleDotPointerDown(w, e)}
            onPointerMove={handleDotPointerMove}
            onPointerUp={(e) => handleDotPointerUp(w, e)}
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${w.x * 100}%`,
              top: `${w.y * 100}%`,
              touchAction: "none",
            }}
            className={cn(
              "absolute w-[22px] h-[22px] rounded-full border-2 border-white",
              "flex items-center justify-center font-mono text-[9px] font-semibold text-white",
              "shadow-[0_2px_8px_rgba(0,0,0,0.2)] -translate-x-1/2 -translate-y-1/2",
              state === "default" && "bg-accent",
              state === "active" && "bg-active animate-dot-pulse",
              state === "completed" && "bg-success",
              mode === "edit" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              isSelected &&
                "outline outline-2 outline-offset-2 outline-ink scale-110",
            )}
          >
            {w.sequence_order}
          </button>
        );
      })}
    </div>
  );
}
