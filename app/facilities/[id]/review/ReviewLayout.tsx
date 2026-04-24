"use client";

import { useState } from "react";
import { MapIcon, MessageSquare } from "lucide-react";
import { cn } from "@/lib/cn";

type Tab = "chat" | "map";

type Props = {
  chat: React.ReactNode;
  canvas: React.ReactNode;
};

export function ReviewLayout({ chat, canvas }: Props) {
  const [tab, setTab] = useState<Tab>("map");

  return (
    <>
      {/* Mobile tab switcher */}
      <div className="lg:hidden mb-3 flex items-center gap-1 p-1 bg-surface-2 border border-surface-3 rounded-full w-fit mx-auto">
        <TabButton
          active={tab === "chat"}
          onClick={() => setTab("chat")}
          icon={<MessageSquare size={13} />}
          label="Chat"
        />
        <TabButton
          active={tab === "map"}
          onClick={() => setTab("map")}
          icon={<MapIcon size={13} />}
          label="Map"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[400px_1fr] items-start">
        <div
          className={cn(
            "h-[calc(100vh-160px)] lg:h-[calc(100vh-120px)] lg:sticky lg:top-6",
            tab === "chat" ? "block" : "hidden lg:block",
          )}
        >
          {chat}
        </div>
        <div
          className={cn(
            "h-[calc(100vh-160px)] lg:h-[calc(100vh-120px)] lg:sticky lg:top-6",
            tab === "map" ? "block" : "hidden lg:block",
          )}
        >
          {canvas}
        </div>
      </div>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors",
        active
          ? "bg-white text-ink shadow-[var(--shadow-sm)]"
          : "text-ink-3 hover:text-ink-2",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
