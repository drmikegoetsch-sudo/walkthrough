"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Map } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

type Dimensions = { width: number; height: number };

async function readImageDimensions(file: File): Promise<Dimensions> {
  const url = URL.createObjectURL(file);
  try {
    const img = new window.Image();
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function NewFacilityPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!["image/png", "image/jpeg"].includes(selected.type)) {
      toast.error("Upload a PNG or JPG. Convert PDFs first.");
      return;
    }
    setFile(selected);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(selected);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Upload a floor plan first.");
      return;
    }
    setSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const dims = await readImageDimensions(file);
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("floor-plans")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("floor-plans")
        .getPublicUrl(path);

      const { data: facility, error: insertError } = await supabase
        .from("facilities")
        .insert({
          user_id: user.id,
          name: name.trim(),
          address: address.trim() || null,
          floor_plan_url: urlData.publicUrl,
          floor_plan_width: dims.width,
          floor_plan_height: dims.height,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      router.push(`/facilities/${facility.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[640px] px-6 py-10">
      <div className="bg-white border border-surface-3 rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-3">
          <Link
            href="/dashboard"
            className="w-7 h-7 border border-surface-3 rounded-lg flex items-center justify-center text-ink-3 hover:text-ink-2 transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={14} />
          </Link>
          <span className="text-sm font-medium">New Facility</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-2">Facility name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Monroe Manufacturing Plant A"
              className="w-full border border-surface-3 rounded-[var(--radius-sm)] px-3 py-2.5 bg-surface text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-2">
              Address <span className="text-ink-4">(optional)</span>
            </span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="1234 Industrial Way"
              className="w-full border border-surface-3 rounded-[var(--radius-sm)] px-3 py-2.5 bg-surface text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-2">Floor plan</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-surface-3 rounded-[var(--radius-md)] p-8 bg-surface hover:border-accent hover:bg-accent-pale/40 transition-colors cursor-pointer"
            >
              {previewUrl ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Floor plan preview"
                    className="max-h-48 rounded-[var(--radius-sm)] border border-surface-3"
                  />
                  <div className="text-xs text-ink-3">
                    {file?.name} · click to change
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-11 h-11 bg-surface-2 rounded-[var(--radius-sm)] flex items-center justify-center text-ink-3">
                    <Map size={20} />
                  </div>
                  <div className="text-sm font-medium text-ink">Upload floor plan</div>
                  <div className="text-xs text-ink-3">
                    PNG or JPG · convert PDFs first
                  </div>
                </div>
              )}
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link href="/dashboard">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={submitting || !file}>
              {submitting ? "Creating…" : "Create facility"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
