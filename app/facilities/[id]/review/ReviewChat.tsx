"use client";

import { useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mic,
  Pencil,
  Plus,
  Puzzle,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  facilityName: string;
};

export function ReviewChat({ facilityName }: Props) {
  const [input, setInput] = useState("");
  const [actionListOpen, setActionListOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white border border-surface-3 rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            aria-label="Back"
            className="w-7 h-7 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink-2 hover:bg-surface-2 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-ink truncate">
            {facilityName} Review
          </span>
          <button
            type="button"
            aria-label="Rename"
            className="w-6 h-6 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink-2 hover:bg-surface-2 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5 relative">
        {/* User message */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] text-ink-3 font-medium">You</span>
          <div className="max-w-[85%] bg-accent text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed">
            Summarize anything unusual from the last walkthrough at{" "}
            {facilityName}.
          </div>
        </div>

        {/* Assistant message */}
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink">
          <p className="text-ink-2">
            Scanned {facilityName}&rsquo;s most recent walkthrough. Two items
            stand out compared to the prior visit.
          </p>

          <div className="mt-1">
            <h3 className="text-[15px] font-semibold text-ink mb-1">
              Items flagged for follow-up
            </h3>
            <ul className="flex flex-col gap-1.5 list-disc pl-5 marker:text-ink-4 text-ink-2">
              <li>
                <span className="font-semibold text-ink">
                  Waypoint 4 — Loading Dock:
                </span>{" "}
                pallets blocking the emergency exit path. Not present in last
                walkthrough.
              </li>
              <li>
                <span className="font-semibold text-ink">
                  Waypoint 7 — Chemical Storage:
                </span>{" "}
                eyewash station signage faded; confirm inspection tag is
                current.
              </li>
            </ul>
          </div>

          <p className="text-ink-2 mt-1">
            Want me to generate a corrective-action draft for these, or pull
            side-by-side photos from the last two sessions?
          </p>
        </div>

        {/* Action list chip */}
        <button
          type="button"
          onClick={() => setActionListOpen((v) => !v)}
          className="self-start flex items-center gap-2 text-xs text-ink-2 hover:text-ink bg-surface-2 hover:bg-surface-3 border border-surface-3 rounded-full px-3 py-1.5 transition-colors"
        >
          <ChevronRight
            size={12}
            className={cn(
              "transition-transform",
              actionListOpen ? "rotate-90" : "",
            )}
          />
          Show action list
          <span className="text-[10px] font-mono text-ink-3">2/2</span>
        </button>

        {/* User follow-up */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[11px] text-ink-3 font-medium">You</span>
          <div className="max-w-[85%] bg-accent text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed">
            Pull the side-by-side for Waypoint 4.
          </div>
        </div>

        {/* Scroll to bottom floating button */}
        <button
          type="button"
          aria-label="Scroll to latest"
          className="sticky bottom-2 self-center w-8 h-8 rounded-full bg-accent text-white shadow-[var(--shadow-md)] hover:bg-accent-2 flex items-center justify-center transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Composer */}
      <div className="border-t border-surface-3 px-4 py-3 flex-shrink-0">
        <div className="border border-surface-3 rounded-[var(--radius-lg)] bg-white focus-within:border-ink-4 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message SoterAI..."
            rows={1}
            className="w-full resize-none bg-transparent px-3.5 pt-2.5 pb-1 text-sm text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
              <ComposerButton label="Attach">
                <Plus size={14} />
              </ComposerButton>
              <ComposerButton label="Tools">
                <Puzzle size={14} />
              </ComposerButton>
            </div>
            <div className="flex items-center gap-1">
              <ComposerButton label="Voice">
                <Mic size={14} />
              </ComposerButton>
              <button
                type="button"
                disabled={input.trim().length === 0}
                aria-label="Send"
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                  input.trim().length === 0
                    ? "bg-surface-3 text-ink-4 cursor-not-allowed"
                    : "bg-ink text-white hover:bg-ink-2",
                )}
              >
                <ArrowUp size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="text-[10px] text-ink-4 text-center mt-2">
          SoterAI can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
}

function ComposerButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="w-7 h-7 rounded-full text-ink-3 hover:text-ink-2 hover:bg-surface-2 flex items-center justify-center transition-colors"
    >
      {children}
    </button>
  );
}
