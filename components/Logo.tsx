import Image from "next/image";
import { cn } from "@/lib/cn";

type Props = {
  size?: number;
  className?: string;
};

export function Logo({ size = 36, className }: Props) {
  return (
    <Image
      src="/Soter_Icon-Main.jpg"
      alt="Soter"
      width={size}
      height={size}
      priority
      className={cn("rounded-[6px]", className)}
    />
  );
}
