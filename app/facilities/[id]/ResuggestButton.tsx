"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export function ResuggestButton({ facilityId }: { facilityId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/suggest-waypoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Failed to suggest");
        return;
      }
      if (!body.waypoints || body.waypoints.length === 0) {
        toast.error("Claude returned no waypoints. Try again or add manually.");
        return;
      }
      toast.success(`Added ${body.waypoints.length} waypoints`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" onClick={handleClick} disabled={loading}>
      <Sparkles size={12} />
      {loading ? "Analyzing…" : "Suggest with AI"}
    </Button>
  );
}
