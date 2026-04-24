import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white border border-surface-3 rounded-[var(--radius-md)] p-6",
        className,
      )}
      {...rest}
    />
  );
}
