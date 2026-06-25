import { cn } from "@/lib/utils";
import type { EventStatus } from "@/generated/prisma";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

const eventStatusMap: Record<
  EventStatus,
  { label: string; className: string; dot: string }
> = {
  draft: { label: "Borrador", className: "bg-white/10 text-muted", dot: "bg-muted" },
  published: {
    label: "Disponible",
    className: "bg-emerald/15 text-emerald-soft",
    dot: "bg-emerald-soft",
  },
  sold_out: { label: "Agotado", className: "bg-danger/15 text-red-300", dot: "bg-red-400" },
  cancelled: { label: "Cancelado", className: "bg-white/10 text-muted", dot: "bg-muted" },
  finished: { label: "Finalizado", className: "bg-white/10 text-muted", dot: "bg-muted" },
};

/** Estado de un evento, considerando si la fecha ya pasó. */
export function EventStatusBadge({
  status,
  date,
}: {
  status: EventStatus;
  date?: Date | string;
}) {
  let key: EventStatus = status;
  // Server component: lectura de tiempo por request (no es un render reactivo).
  // eslint-disable-next-line react-hooks/purity
  if (date && new Date(date).getTime() < Date.now() && status === "published") {
    key = "finished";
  }
  // "próximamente" se representa con published sin que aún esté a la venta;
  // aquí lo dejamos en el mapa estándar.
  const cfg = eventStatusMap[key];
  return (
    <Badge className={cfg.className}>
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}
