import { Ticket, Flame, TriangleAlert, CircleCheck, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { urgencyForAvailable, type UrgencyLevel } from "@/lib/sessions";

const toneMap: Record<
  UrgencyLevel,
  { text: string; bar: string; chip: string; icon: React.ComponentType<{ className?: string }> }
> = {
  available: {
    text: "text-emerald-soft",
    bar: "from-emerald to-emerald-soft",
    chip: "bg-emerald/15 text-emerald-soft",
    icon: CircleCheck,
  },
  last: {
    text: "text-gold-soft",
    bar: "from-gold to-gold-soft",
    chip: "bg-gold/15 text-gold-soft",
    icon: Flame,
  },
  almost: {
    text: "text-orange-300",
    bar: "from-orange-500 to-amber-400",
    chip: "bg-orange-500/15 text-orange-300",
    icon: TriangleAlert,
  },
  soldout: {
    text: "text-red-300",
    bar: "from-red-600 to-red-500",
    chip: "bg-danger/15 text-red-300",
    icon: Ban,
  },
};

/**
 * Contador público de inventario con barra de progreso y mensaje de urgencia.
 * Pensado para el inventario "con tope" del evento (ej. Preventa de 35).
 */
export function EventAvailability({
  available,
  total,
  percentSold,
  label = "Entradas",
  className,
}: {
  available: number;
  total: number;
  percentSold: number;
  label?: string;
  className?: string;
}) {
  const { level, label: urgency } = urgencyForAvailable(available);
  const tone = toneMap[level];
  const Icon = tone.icon;

  return (
    <div className={cn("rounded-2xl glass p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Ticket className="size-4 text-gold-soft" />
          <span className="text-sm font-medium text-muted">{label}</span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            tone.chip,
            level === "almost" && "animate-pulse-soft",
          )}
        >
          <Icon className="size-3.5" />
          {urgency}
        </span>
      </div>

      <p className="mt-3 font-display text-2xl font-bold">
        {available > 0 ? (
          <>
            Quedan <span className={tone.text}>{available}</span> de {total}
          </>
        ) : (
          <span className={tone.text}>Entradas agotadas</span>
        )}
      </p>

      {/* Barra de progreso */}
      <div className="mt-3">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all", tone.bar)}
            style={{ width: `${Math.max(percentSold, available > 0 ? 4 : 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted">
          <span>{percentSold}% vendido</span>
          <span>
            {Math.min(total - available, total)} / {total}
          </span>
        </div>
      </div>
    </div>
  );
}
