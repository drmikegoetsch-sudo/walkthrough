"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  ReviewStatusSelect,
  type ReviewStatus,
} from "../ReviewStatusSelect";

type Waypoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  sequence_order: number;
};

type Photo = {
  id: string;
  waypoint_id: string | null;
  session_id: string;
  public_url: string;
  captured_at: string;
};

type WalkSessionRow = {
  id: string;
  started_at: string;
  review_status: ReviewStatus;
};

type Props = {
  floorPlanUrl: string;
  floorPlanWidth: number | null;
  floorPlanHeight: number | null;
  waypoints: Waypoint[];
  photos: Photo[];
  sessions: WalkSessionRow[];
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export function ReviewClient({
  floorPlanUrl,
  floorPlanWidth,
  floorPlanHeight,
  waypoints,
  photos,
  sessions,
}: Props) {
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(
    null,
  );
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loadedAspect, setLoadedAspect] = useState<number | null>(null);

  const aspect =
    floorPlanWidth && floorPlanHeight
      ? floorPlanWidth / floorPlanHeight
      : loadedAspect;

  const filteredPhotos = useMemo(
    () =>
      sessionFilter === "all"
        ? photos
        : photos.filter((p) => p.session_id === sessionFilter),
    [photos, sessionFilter],
  );

  const photosByWaypoint = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const p of filteredPhotos) {
      if (!p.waypoint_id) continue;
      if (!map.has(p.waypoint_id)) map.set(p.waypoint_id, []);
      map.get(p.waypoint_id)!.push(p);
    }
    return map;
  }, [filteredPhotos]);

  const selectedWaypoint = waypoints.find((w) => w.id === selectedWaypointId);
  const selectedPhotos = selectedWaypoint
    ? (photosByWaypoint.get(selectedWaypoint.id) ?? [])
    : [];
  const activePhoto = selectedPhotos[photoIndex];

  const selectWaypoint = useCallback((id: string) => {
    setSelectedWaypointId(id);
    setPhotoIndex(0);
  }, []);

  const closeWaypoint = useCallback(() => {
    setSelectedWaypointId(null);
    setPhotoIndex(0);
  }, []);

  const prevPhoto = useCallback(() => {
    setPhotoIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const nextPhoto = useCallback(() => {
    setPhotoIndex((i) =>
      i < selectedPhotos.length - 1 ? i + 1 : i,
    );
  }, [selectedPhotos.length]);

  // Keyboard nav
  useEffect(() => {
    if (!selectedWaypoint) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxOpen) setLightboxOpen(false);
        else closeWaypoint();
      } else if (e.key === "ArrowRight") nextPhoto();
      else if (e.key === "ArrowLeft") prevPhoto();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedWaypoint, lightboxOpen, closeWaypoint, nextPhoto, prevPhoto]);

  return (
    <>
      <div className="bg-white border border-surface-3 rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-sm)] h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3 flex-wrap gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-ink-3 mr-1">Session:</span>
            <FilterChip
              active={sessionFilter === "all"}
              onClick={() => setSessionFilter("all")}
            >
              All
            </FilterChip>
            {sessions.map((s) => (
              <FilterChip
                key={s.id}
                active={sessionFilter === s.id}
                onClick={() => setSessionFilter(s.id)}
              >
                {dateFormatter.format(new Date(s.started_at))}
              </FilterChip>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {sessionFilter !== "all"
              ? (() => {
                  const active = sessions.find((s) => s.id === sessionFilter);
                  return active ? (
                    <ReviewStatusSelect
                      sessionId={active.id}
                      status={active.review_status}
                    />
                  ) : null;
                })()
              : null}
            <span className="text-xs text-ink-3 font-mono">
              {filteredPhotos.length} photos · {waypoints.length} waypoints
            </span>
          </div>
        </div>

        {selectedWaypoint ? (
          <div className="grid md:grid-cols-[1fr_300px] flex-1 min-h-0">
            {/* Main photo viewer */}
            <div className="relative bg-ink flex flex-col min-h-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div>
                  <div className="text-sm font-medium text-white">
                    {selectedWaypoint.label}
                  </div>
                  <div className="text-[11px] text-white/60 font-mono mt-0.5">
                    {activePhoto
                      ? `${photoIndex + 1} of ${selectedPhotos.length} · ${dateFormatter.format(
                          new Date(activePhoto.captured_at),
                        )} ${timeFormatter.format(new Date(activePhoto.captured_at))}`
                      : "No photos"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeWaypoint}
                  aria-label="Close"
                  className="w-8 h-8 rounded-[var(--radius-sm)] text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative flex-1 min-h-0 flex items-center justify-center p-4">
                {activePhoto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activePhoto.public_url}
                      alt=""
                      className="max-w-full max-h-full object-contain select-none cursor-zoom-in"
                      draggable={false}
                      onClick={() => setLightboxOpen(true)}
                    />
                    {selectedPhotos.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={prevPhoto}
                          disabled={photoIndex === 0}
                          aria-label="Previous photo"
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={nextPhoto}
                          disabled={photoIndex === selectedPhotos.length - 1}
                          aria-label="Next photo"
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label="Full screen"
                      className="absolute top-3 right-3 w-9 h-9 rounded-[var(--radius-sm)] bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </>
                ) : (
                  <div className="text-center text-white/60 text-sm">
                    No photos for this waypoint
                    {sessionFilter !== "all" ? " in this session" : ""}.
                  </div>
                )}
              </div>

              {selectedPhotos.length > 1 ? (
                <div className="px-3 py-2 border-t border-white/10 flex gap-2 overflow-x-auto">
                  {selectedPhotos.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPhotoIndex(i)}
                      className={cn(
                        "relative flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-colors",
                        i === photoIndex
                          ? "border-accent"
                          : "border-transparent hover:border-white/30",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.public_url}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Sidebar: floor plan nav */}
            <div className="border-t md:border-t-0 md:border-l border-surface-3 bg-white flex flex-col">
              <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-2">
                  Waypoints
                </span>
                <span className="text-[11px] text-ink-3 font-mono">
                  {waypoints.length}
                </span>
              </div>
              <div className="relative bg-surface-2 p-2">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={floorPlanUrl}
                    alt=""
                    draggable={false}
                    className="w-full block select-none rounded-[var(--radius-sm)]"
                  />
                  {waypoints.map((w) => {
                    const photoCount = photosByWaypoint.get(w.id)?.length ?? 0;
                    const isSelected = w.id === selectedWaypointId;
                    const hasPhotos = photoCount > 0;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        title={`${w.label} — ${photoCount} photo${photoCount === 1 ? "" : "s"}`}
                        onClick={() => selectWaypoint(w.id)}
                        style={{
                          left: `${w.x * 100}%`,
                          top: `${w.y * 100}%`,
                        }}
                        className={cn(
                          "absolute rounded-full border-2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125 shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
                          isSelected
                            ? "w-[18px] h-[18px] bg-active border-white animate-dot-pulse z-10"
                            : hasPhotos
                              ? "w-3 h-3 bg-accent border-white"
                              : "w-2 h-2 bg-ink-4 border-surface-3",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto border-t border-surface-3">
                {waypoints.map((w) => {
                  const count = photosByWaypoint.get(w.id)?.length ?? 0;
                  const isSelected = w.id === selectedWaypointId;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => selectWaypoint(w.id)}
                      className={cn(
                        "w-full px-4 py-2.5 text-left border-b border-surface-3 last:border-b-0 flex items-center justify-between transition-colors",
                        isSelected
                          ? "bg-accent-pale"
                          : "hover:bg-surface-2/60",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium truncate",
                          isSelected ? "text-accent" : "text-ink-2",
                        )}
                      >
                        {w.label}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-mono ml-2 flex-shrink-0",
                          count > 0 ? "text-ink-3" : "text-ink-4",
                        )}
                      >
                        {count} photo{count === 1 ? "" : "s"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative bg-surface-2 flex-1 min-h-0 flex items-center justify-center p-4 overflow-hidden">
            <div
              className="relative h-full w-auto max-w-full max-h-full"
              style={{ aspectRatio: aspect ?? undefined }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={floorPlanUrl}
                alt=""
                draggable={false}
                onLoad={(e) => {
                  if (!aspect) {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setLoadedAspect(img.naturalWidth / img.naturalHeight);
                    }
                  }
                }}
                className="w-full h-full object-contain select-none block"
              />
              {waypoints.map((w) => {
                const photoCount = photosByWaypoint.get(w.id)?.length ?? 0;
                const hasPhotos = photoCount > 0;
                return (
                  <button
                    key={w.id}
                    type="button"
                    title={`${w.label} — ${photoCount} photo${photoCount === 1 ? "" : "s"}`}
                    onClick={() => selectWaypoint(w.id)}
                    style={{ left: `${w.x * 100}%`, top: `${w.y * 100}%` }}
                    className={cn(
                      "absolute rounded-full border-2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125 shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
                      hasPhotos
                        ? "w-[18px] h-[18px] bg-accent border-white"
                        : "w-3 h-3 bg-ink-4 border-surface-3",
                    )}
                  />
                );
              })}
            </div>

            <div className="absolute bottom-3 right-3 bg-white border border-surface-3 rounded-lg px-2.5 py-2 flex flex-col gap-1 shadow-[var(--shadow-sm)]">
              <LegendRow color="bg-accent" label="Has photos" />
              <LegendRow color="bg-ink-4" label="No photos" dim />
            </div>

            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur border border-surface-3 rounded-lg px-3 py-2 text-xs text-ink-2 shadow-[var(--shadow-sm)]">
              Tap a waypoint to view photos
            </div>
          </div>
        )}
      </div>

      {/* Full-screen lightbox */}
      {lightboxOpen && activePhoto ? (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
          <div className="absolute top-4 left-4 text-xs font-mono text-white/70">
            {selectedWaypoint?.label} · {photoIndex + 1}/{selectedPhotos.length}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activePhoto.public_url}
            alt=""
            className="max-w-[95vw] max-h-[95vh] object-contain select-none"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
          {selectedPhotos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                disabled={photoIndex === 0}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                disabled={photoIndex === selectedPhotos.length - 1}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronRight size={24} />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs px-2.5 py-1 rounded-full border transition-colors",
        active
          ? "bg-ink text-white border-ink"
          : "bg-white text-ink-2 border-surface-3 hover:border-ink-4",
      )}
    >
      {children}
    </button>
  );
}

function LegendRow({
  color,
  label,
  dim,
}: {
  color: string;
  label: string;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-ink-3">
      <span
        className={cn(
          "w-2.5 h-2.5 rounded-full border",
          color,
          dim ? "border-surface-3" : "border-white",
        )}
      />
      {label}
    </div>
  );
}
