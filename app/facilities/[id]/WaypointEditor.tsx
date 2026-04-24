"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  HelpCircle,
  MapPin,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { FloorPlan, type FloorPlanWaypoint } from "@/components/FloorPlan";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

type EditorWaypoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  sequence_order: number;
  ai_suggested: boolean;
  _isNew?: boolean;
  _isDeleted?: boolean;
};

type Props = {
  facilityId: string;
  floorPlanUrl: string;
  initialWaypoints: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    sequence_order: number;
    ai_suggested: boolean;
  }>;
};

function resequence(waypoints: EditorWaypoint[]): EditorWaypoint[] {
  const visible = waypoints
    .filter((w) => !w._isDeleted)
    .sort((a, b) => a.sequence_order - b.sequence_order);
  const withSequence = new Map(
    visible.map((w, i) => [w.id, { ...w, sequence_order: i + 1 }]),
  );
  return waypoints.map((w) => withSequence.get(w.id) ?? w);
}

export function WaypointEditor({
  facilityId,
  floorPlanUrl,
  initialWaypoints,
}: Props) {
  const router = useRouter();
  const [waypoints, setWaypoints] = useState<EditorWaypoint[]>(initialWaypoints);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const explainerKey = `soter-waypoint-explainer-seen-${facilityId}`;

  // Auto-open the explainer the first time this facility is edited with no
  // waypoints yet. Once dismissed we don't show it again on this facility.
  useEffect(() => {
    if (initialWaypoints.length > 0) return;
    try {
      if (!localStorage.getItem(explainerKey)) {
        setExplainerOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, [initialWaypoints.length, explainerKey]);

  function dismissExplainer() {
    setExplainerOpen(false);
    try {
      localStorage.setItem(explainerKey, "1");
    } catch {
      /* ignore */
    }
  }
  const originalIds = useMemo(
    () => new Set(initialWaypoints.map((w) => w.id)),
    [initialWaypoints],
  );

  const visible = useMemo(
    () =>
      waypoints
        .filter((w) => !w._isDeleted)
        .sort((a, b) => a.sequence_order - b.sequence_order),
    [waypoints],
  );

  const isDirty = useMemo(() => {
    if (waypoints.some((w) => w._isNew || w._isDeleted)) return true;
    return waypoints.some((w) => {
      const original = initialWaypoints.find((o) => o.id === w.id);
      if (!original) return true;
      return (
        original.label !== w.label ||
        original.x !== w.x ||
        original.y !== w.y ||
        original.sequence_order !== w.sequence_order
      );
    });
  }, [waypoints, initialWaypoints]);

  function handleAdd(x: number, y: number) {
    const nextOrder = visible.length + 1;
    const id = crypto.randomUUID();
    setWaypoints((prev) => [
      ...prev,
      {
        id,
        label: `Waypoint ${nextOrder}`,
        x,
        y,
        sequence_order: nextOrder,
        ai_suggested: false,
        _isNew: true,
      },
    ]);
    setSelectedId(id);
  }

  function handleMove(id: string, x: number, y: number) {
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, x, y } : w)),
    );
  }

  function handleRename(id: string, label: string) {
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, label } : w)),
    );
  }

  function handleDelete(id: string) {
    setWaypoints((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...w, _isDeleted: true } : w,
      );
      return resequence(next);
    });
    if (selectedId === id) setSelectedId(null);
  }

  function handleReorder(id: string, direction: -1 | 1) {
    const index = visible.findIndex((w) => w.id === id);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= visible.length) return;
    const a = visible[index];
    const b = visible[swapIndex];
    setWaypoints((prev) =>
      prev.map((w) => {
        if (w.id === a.id) return { ...w, sequence_order: b.sequence_order };
        if (w.id === b.id) return { ...w, sequence_order: a.sequence_order };
        return w;
      }),
    );
  }

  function handleReset() {
    setWaypoints(initialWaypoints);
    setSelectedId(null);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const toDelete = waypoints
      .filter((w) => w._isDeleted && originalIds.has(w.id))
      .map((w) => w.id);

    const toUpsert = waypoints
      .filter((w) => !w._isDeleted)
      .map((w) => ({
        id: w.id,
        facility_id: facilityId,
        label: w.label,
        x: w.x,
        y: w.y,
        sequence_order: w.sequence_order,
        ai_suggested: w.ai_suggested,
      }));

    try {
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("waypoints")
          .delete()
          .in("id", toDelete);
        if (error) throw error;
      }
      if (toUpsert.length > 0) {
        const { error } = await supabase.from("waypoints").upsert(toUpsert);
        if (error) throw error;
      }
      toast.success("Saved");
      router.refresh();
      setSelectedId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const dotWaypoints: FloorPlanWaypoint[] = visible.map((w) => ({
    id: w.id,
    label: w.label,
    x: w.x,
    y: w.y,
    sequence_order: w.sequence_order,
  }));

  return (
    <div className="bg-white border border-surface-3 rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-sm)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-3 border-b border-surface-3">
        <div className="flex items-center gap-2 text-ink-2">
          <MapPin size={14} className="text-accent flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">
            Tap the map to add a waypoint
          </span>
          <button
            type="button"
            onClick={() => setExplainerOpen(true)}
            className="text-ink-3 hover:text-ink-2 transition-colors flex-shrink-0"
            aria-label="What are waypoints?"
          >
            <HelpCircle size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={isDirty ? "warm" : "neutral"} dot={isDirty}>
            {isDirty ? "Unsaved" : "All saved"}
          </Badge>
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!isDirty || saving}
          >
            Reset
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? "Saving…" : "Save path"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-[1fr_260px] md:min-h-[480px]">
        <FloorPlan
          floorPlanUrl={floorPlanUrl}
          waypoints={dotWaypoints}
          mode="edit"
          selectedId={selectedId}
          onAdd={handleAdd}
          onMove={handleMove}
          onSelect={setSelectedId}
        />

        <div className="border-t md:border-t-0 md:border-l border-surface-3 bg-white flex flex-col max-h-[45vh] md:max-h-none">
          <div className="px-3 py-2.5 border-b border-surface-3 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3 font-mono flex items-center justify-between">
            <span>Walk order</span>
            <span className="text-ink-4">{visible.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="p-4 flex flex-col gap-2">
                <div className="text-xs font-medium text-ink-2">
                  No waypoints yet
                </div>
                <div className="text-[11px] text-ink-3 leading-relaxed">
                  Tap anywhere on the floor plan to drop a waypoint. These
                  mark the exact spots where photos get captured on every
                  walkthrough — so your team always gets the same view of
                  the same area.
                </div>
                <button
                  type="button"
                  onClick={() => setExplainerOpen(true)}
                  className="text-[11px] text-accent hover:text-accent-2 font-medium text-left"
                >
                  Learn more →
                </button>
              </div>
            ) : (
              visible.map((w, i) => {
                const isSelected = w.id === selectedId;
                return (
                  <div
                    key={w.id}
                    className={cn(
                      "border-b border-surface-2 px-3 py-2",
                      isSelected && "bg-accent-pale",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full bg-accent flex items-center justify-center font-mono text-[9px] font-semibold text-white flex-shrink-0"
                        aria-hidden
                      >
                        {w.sequence_order}
                      </div>
                      {isSelected ? (
                        <input
                          type="text"
                          value={w.label}
                          onChange={(e) => handleRename(w.id, e.target.value)}
                          autoFocus
                          className="flex-1 min-w-0 border border-surface-3 rounded-[var(--radius-sm)] px-2 py-1 text-xs bg-white focus:outline-none focus:border-accent"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedId(w.id)}
                          className="flex-1 text-left text-xs text-ink hover:text-accent-2 truncate"
                        >
                          {w.label}
                        </button>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 mt-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleReorder(w.id, -1)}
                          disabled={i === 0}
                          className="w-8 h-8 rounded-full hover:bg-white text-ink-3 hover:text-ink-2 disabled:opacity-30 flex items-center justify-center"
                          aria-label="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(w.id, 1)}
                          disabled={i === visible.length - 1}
                          className="w-8 h-8 rounded-full hover:bg-white text-ink-3 hover:text-ink-2 disabled:opacity-30 flex items-center justify-center"
                          aria-label="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(w.id)}
                          className="w-8 h-8 rounded-full hover:bg-white text-ink-3 hover:text-[#b91c1c] flex items-center justify-center"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {explainerOpen ? (
        <WaypointExplainer onDismiss={dismissExplainer} />
      ) : null}
    </div>
  );
}

function WaypointExplainer({ onDismiss }: { onDismiss: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <div
        className="bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-accent-pale flex items-center justify-center flex-shrink-0">
              <MapPin size={16} className="text-accent" />
            </div>
            <div>
              <div className="text-base font-medium text-ink">
                What are waypoints?
              </div>
              <div className="text-xs text-ink-3 mt-0.5">
                The backbone of a consistent walkthrough
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-surface-2 text-ink-3 hover:text-ink-2 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-4 flex flex-col gap-4 overflow-y-auto">
          <p className="text-sm text-ink-2 leading-relaxed">
            A <span className="font-medium text-ink">waypoint</span> is a spot
            on your facility map where a photo will be captured on every
            walkthrough. They lock in what gets inspected and from which
            vantage point — so every walk produces comparable, consistent
            data.
          </p>

          <div className="flex flex-col gap-3 bg-surface-2/60 border border-surface-3 rounded-[var(--radius-md)] p-4">
            <ExplainerRow
              icon={<MapPin size={14} className="text-accent" />}
              title="Tap the map to drop one"
              body="Each tap adds a numbered waypoint. Drag to move, click to rename, reorder in the sidebar."
            />
            <ExplainerRow
              icon={<Camera size={14} className="text-accent" />}
              title="Photos are captured here, every time"
              body="During a walkthrough, the app guides the user from waypoint to waypoint and prompts a photo at each one."
            />
            <ExplainerRow
              icon={<Repeat size={14} className="text-accent" />}
              title="Repeatable across walkthroughs"
              body="Because the same waypoints are used every visit, you can compare the same spot over time and spot what changed."
            />
          </div>

          <div className="text-[11px] text-ink-3 leading-relaxed">
            <span className="font-medium text-ink-2">Tip:</span> place
            waypoints on the critical areas you want eyes on every time —
            electrical rooms, racking aisles, exits, paint booths, anywhere
            hazards tend to appear.
          </div>
        </div>

        <div className="px-5 py-4 border-t border-surface-3 bg-surface-2/40">
          <Button
            variant="primary"
            onClick={onDismiss}
            className="w-full justify-center"
          >
            Got it — let&apos;s place waypoints
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExplainerRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-white border border-surface-3 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-ink">{title}</div>
        <div className="text-[11px] text-ink-3 leading-relaxed mt-0.5">
          {body}
        </div>
      </div>
    </div>
  );
}
