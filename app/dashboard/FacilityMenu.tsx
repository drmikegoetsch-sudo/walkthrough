"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Props = {
  facilityId: string;
  facilityName: string;
};

function extractBucketPath(publicUrl: string | null | undefined, bucket: string) {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

export function FacilityMenu({ facilityId, facilityName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${facilityName}"?\n\nThis permanently removes the facility, its waypoints, walkthroughs, and all captured photos.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      const supabase = createClient();

      // 1. Collect photo storage paths before the DB cascade nukes the rows.
      const { data: photos } = await supabase
        .from("photos")
        .select("storage_path")
        .eq("facility_id", facilityId);

      // 2. Get floor plan path from the facility row.
      const { data: facility } = await supabase
        .from("facilities")
        .select("floor_plan_url")
        .eq("id", facilityId)
        .maybeSingle();

      // 3. Delete the DB row (waypoints, sessions, photo rows cascade).
      const { error } = await supabase
        .from("facilities")
        .delete()
        .eq("id", facilityId);
      if (error) throw error;

      // 4. Best-effort storage cleanup — DB is already consistent if these fail.
      const photoPaths = (photos ?? [])
        .map((p) => p.storage_path)
        .filter((p): p is string => !!p);
      if (photoPaths.length > 0) {
        await supabase.storage.from("inspection-photos").remove(photoPaths);
      }

      const floorPlanPath = extractBucketPath(
        facility?.floor_plan_url,
        "floor-plans",
      );
      if (floorPlanPath) {
        await supabase.storage.from("floor-plans").remove([floorPlanPath]);
      }

      toast.success("Facility deleted");
      setOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Facility menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink hover:bg-surface-2 flex items-center justify-center transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-20 min-w-[180px] bg-white border border-surface-3 rounded-[var(--radius-md)] shadow-[var(--shadow-md)] overflow-hidden py-1"
        >
          <Link
            href={`/facilities/${facilityId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-ink-2 hover:bg-surface-2"
          >
            <Pencil size={12} />
            Edit map &amp; waypoints
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-surface-2 disabled:opacity-50"
          >
            <Trash2 size={12} />
            {deleting ? "Deleting…" : "Delete facility"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
