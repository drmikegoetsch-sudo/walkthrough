import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type DotState =
  | "default"
  | "active"
  | "completed"
  | "has-photos"
  | "no-photos";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  state?: DotState;
  label?: string | number;
};

const styles: Record<DotState, string> = {
  default: "w-[22px] h-[22px] bg-accent",
  active: "w-[22px] h-[22px] bg-active animate-dot-pulse",
  completed: "w-[22px] h-[22px] bg-success",
  "has-photos": "w-[18px] h-[18px] bg-accent",
  "no-photos": "w-3 h-3 bg-ink-4",
};

export function Dot({ state = "default", label, className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "absolute rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
        "flex items-center justify-center font-mono text-[9px] font-semibold text-white",
        "cursor-pointer transition-transform",
        "-translate-x-1/2 -translate-y-1/2 hover:scale-110",
        styles[state],
        className,
      )}
      {...rest}
    >
      {label}
    </button>
  );
}
