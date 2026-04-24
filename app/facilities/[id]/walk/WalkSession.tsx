"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronUp,
  Loader2,
  Map as MapIcon,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type Waypoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  sequence_order: number;
};

type Props = {
  facility: {
    id: string;
    name: string;
    floorPlanUrl: string;
    floorPlanWidth: number | null;
    floorPlanHeight: number | null;
  };
  waypoints: Waypoint[];
  referencePhotoUrls: Record<string, string>;
  initialSessionId: string | null;
  initialCompletedWaypointIds: string[];
};

type UploadState = "uploading" | "done" | "error";

type BurstPhoto = {
  localId: string;
  blobUrl: string;
  blob: Blob;
  state: UploadState;
  storagePath?: string;
  publicUrl?: string;
  dbId?: string;
};

const HINT_KEY = "soter-walk-hint-seen";
const SWIPE_THRESHOLD = 60;
const TAP_THRESHOLD = 10;

export function WalkSession({
  facility,
  waypoints,
  referencePhotoUrls,
  initialSessionId,
  initialCompletedWaypointIds,
}: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureZoneRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [index, setIndex] = useState(0);
  const [burstByWaypoint, setBurstByWaypoint] = useState<
    Record<string, BurstPhoto[]>
  >({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [completedPrior] = useState<Set<string>>(
    () => new Set(initialCompletedWaypointIds),
  );

  const [cameraState, setCameraState] = useState<
    "loading" | "ready" | "denied" | "error"
  >("loading");
  const [cameraMessage, setCameraMessage] = useState<string>("");
  const [flash, setFlash] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{
    waypointId: string;
    localId: string;
  } | null>(null);
  const [finishMissedOpen, setFinishMissedOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showMapNudge, setShowMapNudge] = useState(false);

  const current = waypoints[index];
  const currentBurst = current ? (burstByWaypoint[current.id] ?? []) : [];
  const isLast = index === waypoints.length - 1;
  const referenceUrl = current ? referencePhotoUrls[current.id] : undefined;

  const totalCaptured = useMemo(
    () =>
      Object.values(burstByWaypoint).reduce((sum, arr) => sum + arr.length, 0),
    [burstByWaypoint],
  );

  const hasAnyProgress = totalCaptured > 0 || completedPrior.size > 0;

  // ---- Camera lifecycle ----
  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraState("error");
        setCameraMessage("This browser doesn't support camera access.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraState("ready");
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          setCameraState("denied");
          setCameraMessage(
            "Camera access was blocked. Enable it in your browser settings and reload.",
          );
        } else {
          setCameraState("error");
          setCameraMessage(
            (err as Error)?.message || "Couldn't access the camera.",
          );
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // ---- First-run hint ----
  useEffect(() => {
    if (cameraState !== "ready") return;
    try {
      if (!localStorage.getItem(HINT_KEY)) setShowHint(true);
    } catch {
      /* ignore */
    }
  }, [cameraState]);

  function dismissHint() {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* ignore */
    }
    // After the hint is acknowledged, briefly surface a "tap to see the full map"
    // nudge so users remember where to look.
    setShowMapNudge(true);
    setTimeout(() => setShowMapNudge(false), 4500);
  }

  // Dismiss the map nudge as soon as the user opens the map themselves.
  useEffect(() => {
    if (mapOpen) setShowMapNudge(false);
  }, [mapOpen]);

  // ---- Beforeunload guard ----
  useEffect(() => {
    if (!hasAnyProgress || finalizing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasAnyProgress, finalizing]);

  // ---- Cleanup blob URLs on unmount ----
  useEffect(() => {
    return () => {
      Object.values(burstByWaypoint).forEach((arr) => {
        arr.forEach((p) => URL.revokeObjectURL(p.blobUrl));
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Session creation ----
  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("walk_sessions")
      .insert({ facility_id: facility.id, user_id: user.id })
      .select("id")
      .single();
    if (error) throw error;
    setSessionId(data.id);
    return data.id;
  }

  // ---- Capture ----
  async function captureFrame() {
    if (!current || cameraState !== "ready" || !videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92),
    );
    if (!blob) return;

    const blobUrl = URL.createObjectURL(blob);
    const localId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const waypointId = current.id;

    setBurstByWaypoint((prev) => ({
      ...prev,
      [waypointId]: [
        ...(prev[waypointId] ?? []),
        { localId, blobUrl, blob, state: "uploading" },
      ],
    }));

    setSkipped((prev) => {
      if (!prev.has(waypointId)) return prev;
      const next = new Set(prev);
      next.delete(waypointId);
      return next;
    });

    // Shutter flash + haptic
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        /* ignore */
      }
    }

    // Fire-and-forget upload
    uploadPhoto(waypointId, localId, blob);
  }

  async function uploadPhoto(waypointId: string, localId: string, blob: Blob) {
    try {
      const activeSessionId = await ensureSession();
      const file = new File([blob], `${localId}.jpg`, { type: "image/jpeg" });
      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/jpeg",
      });

      const supabase = createClient();
      const path = `${activeSessionId}/${waypointId}/${localId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("inspection-photos")
        .upload(path, compressed, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("inspection-photos")
        .getPublicUrl(path);

      const { data: inserted, error: insertError } = await supabase
        .from("photos")
        .insert({
          session_id: activeSessionId,
          waypoint_id: waypointId,
          facility_id: facility.id,
          storage_path: path,
          public_url: urlData.publicUrl,
          capture_source: "phone",
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      setBurstByWaypoint((prev) => {
        const arr = prev[waypointId] ?? [];
        return {
          ...prev,
          [waypointId]: arr.map((p) =>
            p.localId === localId
              ? {
                  ...p,
                  state: "done",
                  storagePath: path,
                  publicUrl: urlData.publicUrl,
                  dbId: inserted.id,
                }
              : p,
          ),
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setBurstByWaypoint((prev) => {
        const arr = prev[waypointId] ?? [];
        return {
          ...prev,
          [waypointId]: arr.map((p) =>
            p.localId === localId ? { ...p, state: "error" } : p,
          ),
        };
      });
    }
  }

  // ---- Delete a burst photo ----
  async function deletePhoto(waypointId: string, localId: string) {
    const arr = burstByWaypoint[waypointId] ?? [];
    const photo = arr.find((p) => p.localId === localId);
    if (!photo) return;

    setBurstByWaypoint((prev) => ({
      ...prev,
      [waypointId]: (prev[waypointId] ?? []).filter(
        (p) => p.localId !== localId,
      ),
    }));
    URL.revokeObjectURL(photo.blobUrl);

    if (photo.state === "done" && photo.storagePath) {
      const supabase = createClient();
      try {
        await supabase
          .from("photos")
          .delete()
          .eq("id", photo.dbId ?? "");
        await supabase.storage
          .from("inspection-photos")
          .remove([photo.storagePath]);
      } catch {
        /* best effort */
      }
    }
  }

  // ---- Navigation ----
  const advance = useCallback(() => {
    if (!current) return;
    if (currentBurst.length === 0) {
      setSkipped((prev) => new Set(prev).add(current.id));
    }
    setIndex((i) => Math.min(i + 1, waypoints.length - 1));
  }, [current, currentBurst.length, waypoints.length]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // ---- Swipe gesture handling ----
  useEffect(() => {
    const el = captureZoneRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let pointerActive = false;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-nogesture]")) return;
      pointerActive = true;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
    }

    function onPointerUp(e: PointerEvent) {
      if (!pointerActive) return;
      pointerActive = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const dt = Date.now() - startTime;

      if (absX < TAP_THRESHOLD && absY < TAP_THRESHOLD && dt < 500) {
        captureFrame();
        return;
      }

      if (absX > SWIPE_THRESHOLD && absX > absY * 1.3 && dt < 700) {
        if (dx < 0) {
          // Swipe left → next / finish
          if (isLast) {
            handleFinishAttempt();
          } else {
            advance();
          }
        } else if (dx > 0 && index > 0) {
          goBack();
        }
      }
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", () => {
      pointerActive = false;
    });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isLast, current?.id, currentBurst.length]);

  // ---- Finish flow ----
  function handleFinishAttempt() {
    // Commit current waypoint (skip if empty) then check missed
    if (current && currentBurst.length === 0) {
      setSkipped((prev) => new Set(prev).add(current.id));
    }
    const remainingMissed = waypoints.filter((w) => {
      if (w.id === current?.id && currentBurst.length === 0) return true;
      if (w.id === current?.id && currentBurst.length > 0) return false;
      return (
        (burstByWaypoint[w.id]?.length ?? 0) === 0 &&
        !completedPrior.has(w.id)
      );
    });
    if (remainingMissed.length > 0) {
      setFinishMissedOpen(true);
    } else {
      finalizeSession();
    }
  }

  async function finalizeSession() {
    if (finalizing) return;
    setFinalizing(true);
    try {
      const activeSessionId = await ensureSession();
      // Wait briefly for in-flight uploads
      const stillUploading = () =>
        Object.values(burstByWaypoint).some((arr) =>
          arr.some((p) => p.state === "uploading"),
        );
      const start = Date.now();
      while (stillUploading() && Date.now() - start < 8000) {
        await new Promise((r) => setTimeout(r, 250));
      }

      const supabase = createClient();
      await supabase
        .from("walk_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", activeSessionId);
      toast.success("Walkthrough complete");
      router.push(`/facilities/${facility.id}/review`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Finish failed";
      toast.error(message);
      setFinalizing(false);
    }
  }

  function jumpTo(targetIndex: number) {
    setFinishMissedOpen(false);
    setMapOpen(false);
    setIndex(targetIndex);
  }

  // ---- Render ----
  if (cameraState !== "ready" && cameraState !== "loading") {
    return (
      <main className="fixed inset-0 bg-ink text-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-base font-medium mb-2">
            {cameraState === "denied"
              ? "Camera access needed"
              : "Camera unavailable"}
          </div>
          <div className="text-sm text-white/60 mb-6">{cameraMessage}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-[var(--radius-sm)] bg-accent text-white text-sm font-medium"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }

  if (!current) return null;

  const prevLabel = index > 0 ? waypoints[index - 1].label : null;

  return (
    <main
      className="fixed inset-x-0 top-0 bg-black text-white overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* Live viewfinder */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />


      {/* Shutter flash */}
      {flash ? (
        <div className="absolute inset-0 bg-white/70 pointer-events-none animate-[fadeOut_120ms_ease-out]" />
      ) : null}

      {/* Camera loading */}
      {cameraState === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/60 z-10">
          <Loader2 size={28} className="animate-spin text-white/70" />
        </div>
      ) : null}

      {/* Overlay chrome */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Top: waypoint card (tap to open map) */}
        <div
          data-nogesture
          className="flex-shrink-0 pointer-events-auto pt-[max(env(safe-area-inset-top),12px)]"
          style={{
            paddingLeft: "max(env(safe-area-inset-left), 16px)",
            paddingRight: "max(env(safe-area-inset-right), 16px)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] text-white/70 tracking-[0.05em] flex-shrink-0">
              {index + 1}/{waypoints.length}
            </span>
            <div className="flex-1 flex gap-1 min-w-0 overflow-hidden">
              {waypoints.map((w, i) => (
                <div
                  key={w.id}
                  className={cn(
                    "flex-1 h-[3px] rounded-[2px] min-w-[3px]",
                    (burstByWaypoint[w.id]?.length ?? 0) > 0
                      ? "bg-success"
                      : skipped.has(w.id)
                        ? "bg-active"
                        : i === index
                          ? "bg-accent"
                          : "bg-white/25",
                  )}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-[var(--radius-md)] px-3.5 py-2.5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
            aria-label="Open facility map"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-mono">
                Current waypoint
              </div>
              <div className="text-sm font-medium truncate">
                {current.label}
              </div>
            </div>
            <span className="flex-shrink-0 flex items-center gap-1.5 bg-accent/90 text-white px-2.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em]">
              <MapIcon size={13} />
              Map
              <ChevronUp size={12} className="opacity-80" />
            </span>
          </button>
          {showMapNudge ? (
            <div className="mt-2 flex items-center justify-end">
              <div className="flex items-center gap-1.5 text-[10px] text-white/80 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1 animate-[fadeInUp_300ms_ease-out]">
                <ChevronUp size={10} />
                Tap to see the full map
              </div>
            </div>
          ) : null}
        </div>

        {/* Middle: capture zone (fills remaining) */}
        <div
          ref={captureZoneRef}
          className="flex-1 pointer-events-auto touch-none relative"
        >
          {/* Framing brackets */}
          <div className="absolute inset-6 pointer-events-none">
            <Bracket className="top-0 left-0" />
            <Bracket className="top-0 right-0 rotate-90" />
            <Bracket className="bottom-0 right-0 rotate-180" />
            <Bracket className="bottom-0 left-0 -rotate-90" />
          </div>

          {/* Previous view thumbnail */}
          {referenceUrl ? (
            <div
              data-nogesture
              className="absolute top-3 right-3 w-[110px] flex flex-col gap-1"
            >
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] font-mono text-white/80 bg-black/55 backdrop-blur-sm px-1.5 py-0.5 rounded-sm w-fit">
                Previous view
              </div>
              <div className="rounded-[var(--radius-sm)] overflow-hidden border border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.5)] aspect-[4/3] bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceUrl}
                  alt="Previous walkthrough photo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : null}

          {/* Back hint */}
          {index > 0 && prevLabel ? (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40">
              <div className="flex items-center gap-1 text-[10px] text-white/80 font-mono bg-black/40 rounded-full px-2 py-1">
                <ArrowLeft size={10} />
                <span className="truncate max-w-[80px]">{prevLabel}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Bottom: burst tray + actions */}
        <div
          data-nogesture
          className="flex-shrink-0 pointer-events-auto pt-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent"
          style={{
            paddingLeft: "max(env(safe-area-inset-left), 16px)",
            paddingRight: "max(env(safe-area-inset-right), 16px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          }}
        >
          {/* Thumbnail tray */}
          {currentBurst.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
              {currentBurst.map((p) => (
                <button
                  key={p.localId}
                  type="button"
                  onClick={() =>
                    setReviewTarget({
                      waypointId: current.id,
                      localId: p.localId,
                    })
                  }
                  className="relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 border-white/20 active:border-white/60 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.blobUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {p.state === "uploading" ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={14} className="animate-spin text-white" />
                    </div>
                  ) : null}
                  {p.state === "error" ? (
                    <div className="absolute inset-0 bg-active/60 flex items-center justify-center text-[9px] font-mono">
                      !
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            {/* Left: back button (or spacer) */}
            <div className="w-20 flex justify-start">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="h-10 px-3 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 flex items-center gap-1.5 transition-all text-xs font-medium"
                  aria-label="Previous waypoint"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
              ) : null}
            </div>

            {/* Center: shutter button */}
            <button
              type="button"
              onClick={captureFrame}
              disabled={cameraState !== "ready"}
              aria-label="Capture photo"
              className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <span className="absolute inset-0 rounded-full border-[3px] border-white/90" />
              <span className="absolute inset-1.5 rounded-full bg-white" />
            </button>

            {/* Right: next/skip/finish */}
            <div className="w-20 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (isLast) handleFinishAttempt();
                  else advance();
                }}
                disabled={finalizing}
                className={cn(
                  "h-10 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium active:scale-95 transition-all",
                  currentBurst.length > 0
                    ? "bg-accent text-white hover:bg-accent-2"
                    : "bg-white/15 text-white hover:bg-white/20",
                )}
              >
                {finalizing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isLast ? (
                  currentBurst.length > 0 ? (
                    <>
                      <Check size={14} />
                      Finish
                    </>
                  ) : (
                    <>
                      Skip
                      <ArrowRight size={14} />
                    </>
                  )
                ) : currentBurst.length > 0 ? (
                  <>
                    Next
                    <ArrowRight size={14} />
                  </>
                ) : (
                  <>
                    Skip
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-center text-[10px] text-white/50 font-mono mt-2">
            {currentBurst.length === 0
              ? "Tap shutter or anywhere on screen to capture"
              : `${currentBurst.length} photo${currentBurst.length === 1 ? "" : "s"} captured · tap shutter for more`}
          </div>
        </div>
      </div>

      {/* Shutter + nudge keyframes */}
      <style jsx>{`
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* First-run hint */}
      {showHint ? (
        <HintOverlay onDismiss={dismissHint} />
      ) : null}

      {/* Map sheet */}
      {mapOpen ? (
        <MapSheet
          facility={facility}
          waypoints={waypoints}
          currentId={current.id}
          burstByWaypoint={burstByWaypoint}
          skipped={skipped}
          onPick={jumpTo}
          onClose={() => setMapOpen(false)}
        />
      ) : null}

      {/* Review photo overlay */}
      {reviewTarget ? (
        <PhotoReviewOverlay
          photo={
            (burstByWaypoint[reviewTarget.waypointId] ?? []).find(
              (p) => p.localId === reviewTarget.localId,
            )!
          }
          onDelete={() => {
            deletePhoto(reviewTarget.waypointId, reviewTarget.localId);
            setReviewTarget(null);
          }}
          onClose={() => setReviewTarget(null)}
        />
      ) : null}

      {/* Finish missed sheet */}
      {finishMissedOpen ? (
        <FinishMissedSheet
          waypoints={waypoints}
          burstByWaypoint={burstByWaypoint}
          completedPrior={completedPrior}
          onJump={jumpTo}
          onFinish={() => {
            setFinishMissedOpen(false);
            finalizeSession();
          }}
          onCancel={() => setFinishMissedOpen(false)}
          finalizing={finalizing}
        />
      ) : null}
    </main>
  );
}

// ------- Sub-components -------

function Bracket({ className }: { className?: string }) {
  return (
    <div
      className={cn("absolute w-6 h-6", className)}
      style={{
        borderTop: "2px solid rgba(255,255,255,0.35)",
        borderLeft: "2px solid rgba(255,255,255,0.35)",
        borderTopLeftRadius: 4,
      }}
    />
  );
}

function HintOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onDismiss}
    >
      <div
        className="bg-ink border border-white/10 rounded-[var(--radius-lg)] p-5 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-medium">How to walk</div>
        <div className="flex flex-col gap-3 text-sm text-white/80">
          <HintRow
            label="Tap the shutter — or anywhere on screen — to capture. Tap again for more."
            emoji="📸"
          />
          <HintRow
            label="Swipe left to move to the next waypoint"
            emoji="⬅️"
          />
          <HintRow label="Swipe right to go back" emoji="➡️" />
          <HintRow
            label="Tap the blue MAP pill (top right) to see the full floor plan"
            emoji="🗺️"
          />
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-2.5 rounded-[var(--radius-sm)] bg-accent text-white text-sm font-medium"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function HintRow({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg leading-none">{emoji}</span>
      <span className="flex-1">{label}</span>
    </div>
  );
}

function MapSheet({
  facility,
  waypoints,
  currentId,
  burstByWaypoint,
  skipped,
  onPick,
  onClose,
}: {
  facility: Props["facility"];
  waypoints: Waypoint[];
  currentId: string;
  burstByWaypoint: Record<string, BurstPhoto[]>;
  skipped: Set<string>;
  onPick: (idx: number) => void;
  onClose: () => void;
}) {
  const [aspect, setAspect] = useState<number | null>(() =>
    facility.floorPlanWidth && facility.floorPlanHeight
      ? facility.floorPlanWidth / facility.floorPlanHeight
      : null,
  );

  return (
    <div className="absolute inset-0 z-20 bg-ink/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 border-b border-white/10">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.08em] text-white/50 font-mono">
            Facility map
          </div>
          <div className="text-sm font-medium truncate">{facility.name}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close map and return to camera"
          className="flex-shrink-0 h-9 px-3.5 rounded-full bg-white text-ink flex items-center gap-1.5 text-[12px] font-semibold active:scale-95 transition-transform"
        >
          <X size={14} />
          Close map
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        <div
          className="relative h-full w-auto max-w-full max-h-full"
          style={{ aspectRatio: aspect ?? undefined }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={facility.floorPlanUrl}
            alt=""
            draggable={false}
            onLoad={(e) => {
              if (aspect) return;
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setAspect(img.naturalWidth / img.naturalHeight);
              }
            }}
            className="w-full h-full object-contain select-none"
            style={{ filter: "invert(0.92) hue-rotate(180deg) contrast(0.9)" }}
          />
          {waypoints.map((w, i) => {
            const hasPhotos = (burstByWaypoint[w.id]?.length ?? 0) > 0;
            const isSkipped = skipped.has(w.id);
            const isCurrent = w.id === currentId;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => onPick(i)}
                style={{ left: `${w.x * 100}%`, top: `${w.y * 100}%` }}
                className={cn(
                  "absolute rounded-full -translate-x-1/2 -translate-y-1/2 border-2 flex items-center justify-center text-[9px] font-mono font-semibold text-white",
                  isCurrent
                    ? "w-[28px] h-[28px] bg-accent border-white animate-dot-pulse-blue z-10"
                    : hasPhotos
                      ? "w-[22px] h-[22px] bg-success border-white/70"
                      : isSkipped
                        ? "w-[22px] h-[22px] bg-active border-white/70"
                        : "w-[20px] h-[20px] bg-white/20 border-white/40",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PhotoReviewOverlay({
  photo,
  onDelete,
  onClose,
}: {
  photo: BurstPhoto;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-30 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
        >
          <X size={16} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-9 px-3 rounded-full bg-active/90 hover:bg-active text-white text-sm flex items-center gap-1.5"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.blobUrl}
          alt=""
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

function FinishMissedSheet({
  waypoints,
  burstByWaypoint,
  completedPrior,
  onJump,
  onFinish,
  onCancel,
  finalizing,
}: {
  waypoints: Waypoint[];
  burstByWaypoint: Record<string, BurstPhoto[]>;
  completedPrior: Set<string>;
  onJump: (idx: number) => void;
  onFinish: () => void;
  onCancel: () => void;
  finalizing: boolean;
}) {
  const missed = waypoints
    .map((w, i) => ({ w, i }))
    .filter(
      ({ w }) =>
        (burstByWaypoint[w.id]?.length ?? 0) === 0 && !completedPrior.has(w.id),
    );

  return (
    <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-ink border border-white/10 rounded-[var(--radius-lg)] w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="px-5 pt-5 pb-3">
          <div className="text-base font-medium">
            {missed.length} waypoint{missed.length === 1 ? "" : "s"} still need
            photos
          </div>
          <div className="text-xs text-white/60 mt-1">
            Tap one to go back, or finish without them.
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {missed.map(({ w, i }) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onJump(i)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-sm)] hover:bg-white/5 transition-colors text-left"
            >
              <span className="w-7 h-7 rounded-full bg-active/20 text-active border border-active/40 flex items-center justify-center text-[11px] font-mono font-semibold flex-shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 text-sm truncate">{w.label}</span>
              <ArrowRight size={14} className="text-white/40 flex-shrink-0" />
            </button>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex flex-col gap-2">
          <button
            type="button"
            onClick={onFinish}
            disabled={finalizing}
            className="w-full py-3 rounded-[var(--radius-sm)] bg-accent text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {finalizing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Finish without them
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={finalizing}
            className="w-full py-2 rounded-[var(--radius-sm)] text-xs text-white/60 hover:text-white/80"
          >
            Keep walking
          </button>
        </div>
      </div>
    </div>
  );
}
