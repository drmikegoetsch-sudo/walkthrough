import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "blue" | "green" | "warm" | "neutral";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  dot?: boolean;
};

const tones: Record<Tone, string> = {
  blue: "bg-accent-pale text-accent-2",
  green: "bg-success-pale text-success",
  warm: "bg-[#fff3ed] text-active",
  neutral: "bg-surface-2 text-ink-3",
};

export function Badge({
  tone = "blue",
  dot = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
      )}
      {children}
    </span>
  );
}
