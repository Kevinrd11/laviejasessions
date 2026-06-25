import Link from "next/link";
import { Mountain } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/sessions",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald to-forest shadow-lg shadow-emerald/20">
        <Mountain className="size-5 text-white" strokeWidth={2.2} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-gold-soft">
          La Vieja
        </span>
        <span className="font-display text-lg font-semibold tracking-tight text-foreground">
          Sessions
        </span>
      </span>
    </Link>
  );
}
