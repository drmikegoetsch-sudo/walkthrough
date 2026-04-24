"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <span className="font-mono">Click map to add · drag to move</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={isDirty ? "warm" : "neutral"} dot={isDirty}>
            {isDirty ? "Unsaved changes" : "All saved"}
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

      <div className="grid grid-cols-[1fr_260px] min-h-[480px]">
        <FloorPlan
          floorPlanUrl={floorPlanUrl}
          waypoints={dotWaypoints}
          mode="edit"
          selectedId={selectedId}
          onAdd={handleAdd}
          onMove={handleMove}
          onSelect={setSelectedId}
        />

        <div className="border-l border-surface-3 bg-white flex flex-col">
          <div className="px-3 py-2.5 border-b border-surface-3 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3 font-mono">
            Walk order
          </div>
          <div className="flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="p-4 text-xs text-ink-3">
                No waypoints yet. Click the floor plan to add one.
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
                          className="p-1 rounded hover:bg-white text-ink-3 hover:text-ink-2 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(w.id, 1)}
                          disabled={i === visible.length - 1}
                          className="p-1 rounded hover:bg-white text-ink-3 hover:text-ink-2 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(w.id)}
                          className="p-1 rounded hover:bg-white text-ink-3 hover:text-[#b91c1c]"
                          aria-label="Delete"
                        >
                          <Trash2 size={12} />
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
    </div>
  );
}
