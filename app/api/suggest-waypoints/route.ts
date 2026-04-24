import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-6";

const PROMPT = `You are analyzing a manufacturing facility floor plan to recommend inspection waypoints for a safety walkthrough.

Identify 8-15 key inspection locations. Focus on:
- Equipment clusters and machinery areas
- Room entrances and corridor intersections
- High-traffic zones
- Areas with potential safety hazards
- Loading docks, exits, utility areas

Return ONLY valid JSON with this exact structure:
{
  "waypoints": [
    {
      "label": "descriptive name (max 4 words)",
      "x": 0.45,
      "y": 0.32,
      "sequence_order": 1
    }
  ]
}

x and y are normalized coordinates (0.0 to 1.0) relative to image width and height.
Order the waypoints as an efficient walk path (minimize backtracking).
Return only JSON, no other text.`;

type SuggestedWaypoint = {
  label: string;
  x: number;
  y: number;
  sequence_order: number;
};

async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mediaType: "image/png" | "image/jpeg" }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch floor plan: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  const mediaType: "image/png" | "image/jpeg" = contentType.includes("png")
    ? "image/png"
    : "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { data: buffer.toString("base64"), mediaType };
}

function parseWaypoints(text: string): SuggestedWaypoint[] {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.waypoints)) throw new Error("Missing waypoints array");
  return parsed.waypoints.filter(
    (w: SuggestedWaypoint) =>
      typeof w.label === "string" &&
      typeof w.x === "number" &&
      typeof w.y === "number" &&
      typeof w.sequence_order === "number" &&
      w.x >= 0 &&
      w.x <= 1 &&
      w.y >= 0 &&
      w.y <= 1,
  );
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  const { facilityId } = (await request.json()) as { facilityId?: string };
  if (!facilityId) {
    return NextResponse.json({ error: "facilityId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .select("id, floor_plan_url")
    .eq("id", facilityId)
    .maybeSingle();
  if (facilityError || !facility?.floor_plan_url) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  try {
    const { data, mediaType } = await fetchImageAsBase64(facility.floor_plan_url);

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ waypoints: [] });
    }

    let suggestions: SuggestedWaypoint[];
    try {
      suggestions = parseWaypoints(textBlock.text);
    } catch {
      return NextResponse.json({ waypoints: [] });
    }

    if (suggestions.length === 0) {
      return NextResponse.json({ waypoints: [] });
    }

    await supabase
      .from("waypoints")
      .delete()
      .eq("facility_id", facilityId)
      .eq("ai_suggested", true);

    const { data: inserted, error: insertError } = await supabase
      .from("waypoints")
      .insert(
        suggestions.map((w) => ({
          facility_id: facilityId,
          label: w.label,
          x: w.x,
          y: w.y,
          sequence_order: w.sequence_order,
          ai_suggested: true,
        })),
      )
      .select("*");
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ waypoints: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
