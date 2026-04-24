import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "accent" | "ghost" | "capture";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const styles: Record<Variant, string> = {
  primary:
    "bg-ink text-white px-4 py-2 rounded-[var(--radius-sm)] text-sm hover:bg-ink-2",
  accent:
    "bg-accent text-white px-4 py-2 rounded-[var(--radius-sm)] text-sm hover:bg-accent-2",
  ghost:
    "border border-surface-3 bg-white text-ink-2 px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs hover:border-ink-4",
  capture:
    "w-full bg-accent text-white py-4 rounded-[var(--radius-md)] text-base hover:bg-accent-2 active:scale-[0.99] transition-all",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, styles[variant], className)}
      {...rest}
    />
  );
});
