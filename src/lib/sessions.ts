import { db } from "@/lib/db";
import type { SessionTicketType } from "@/generated/prisma";

type InventoryFields = Pick<
  SessionTicketType,
  | "quantityTotal"
  | "quantitySold"
  | "status"
  | "unlimited"
  | "salesStart"
  | "salesEnd"
  | "maxPerOrder"
>;

/**
 * Cupos disponibles de un tipo de entrada.
 * Para entradas ilimitadas devuelve Infinity (uso solo en servidor).
 */
export function availableQuantity(
  t: Pick<SessionTicketType, "quantityTotal" | "quantitySold" | "unlimited">,
) {
  if (t.unlimited) return Number.POSITIVE_INFINITY;
  return Math.max(0, t.quantityTotal - t.quantitySold);
}

/** ¿La venta de este tipo aún no abre? (bloqueada hasta salesStart) */
export function isLockedBeforeStart(
  t: Pick<SessionTicketType, "salesStart">,
  now: Date = new Date(),
) {
  return !!t.salesStart && now.getTime() < new Date(t.salesStart).getTime();
}

/** ¿La venta de este tipo ya cerró? (después de salesEnd) */
export function isClosedAfterEnd(
  t: Pick<SessionTicketType, "salesEnd">,
  now: Date = new Date(),
) {
  return !!t.salesEnd && now.getTime() > new Date(t.salesEnd).getTime();
}

/** Agotado: solo aplica a entradas con tope (no ilimitadas). */
export function isTicketTypeSoldOut(
  t: Pick<SessionTicketType, "quantityTotal" | "quantitySold" | "status" | "unlimited">,
) {
  if (t.unlimited) return false;
  return t.status === "sold_out" || availableQuantity(t) <= 0;
}

/** ¿Se puede comprar este tipo ahora mismo? */
export function isPurchasable(t: InventoryFields, now: Date = new Date()) {
  if (t.status !== "active") return false;
  if (isLockedBeforeStart(t, now)) return false;
  if (isClosedAfterEnd(t, now)) return false;
  return t.unlimited || availableQuantity(t) > 0;
}

/** Cantidad máxima seleccionable por orden, respetando cupo y maxPerOrder. */
export function maxSelectable(t: InventoryFields, now: Date = new Date()) {
  if (!isPurchasable(t, now)) return 0;
  if (t.unlimited) return t.maxPerOrder;
  return Math.min(t.maxPerOrder, availableQuantity(t));
}

// --- Mensajes de urgencia (spec) ---
export type UrgencyLevel = "available" | "last" | "almost" | "soldout";

export function urgencyForAvailable(available: number): {
  level: UrgencyLevel;
  label: string;
} {
  if (available <= 0) return { level: "soldout", label: "Entradas agotadas" };
  if (available <= 5) return { level: "almost", label: "Casi agotado" };
  if (available <= 10)
    return { level: "last", label: "Últimas entradas disponibles" };
  return { level: "available", label: "Entradas disponibles" };
}

/**
 * Inventario "con tope" a nivel de evento (suma de tipos no ilimitados).
 * Sirve para el contador público y la barra de progreso.
 */
export function eventLimitedInventory(
  ticketTypes: Pick<
    SessionTicketType,
    "quantityTotal" | "quantitySold" | "unlimited" | "status"
  >[],
) {
  const limited = ticketTypes.filter((t) => !t.unlimited && t.status !== "hidden");
  const totalCapacity = limited.reduce((s, t) => s + t.quantityTotal, 0);
  const occupied = limited.reduce((s, t) => s + Math.min(t.quantitySold, t.quantityTotal), 0);
  const available = Math.max(0, totalCapacity - occupied);
  const percentSold =
    totalCapacity > 0 ? Math.min(100, Math.round((occupied / totalCapacity) * 100)) : 0;
  return {
    hasLimited: totalCapacity > 0,
    totalCapacity,
    occupied,
    available,
    percentSold,
  };
}

/** ¿El evento permite alguna compra ahora? (algún tipo comprable) */
export function eventHasPurchasable(ticketTypes: InventoryFields[], now: Date = new Date()) {
  return ticketTypes.some((t) => isPurchasable(t, now));
}

/** Precio "desde" de un evento (entrada visible más barata). */
export function priceFrom(ticketTypes: Pick<SessionTicketType, "price" | "status">[]) {
  const visible = ticketTypes.filter((t) => t.status !== "hidden");
  if (visible.length === 0) return null;
  return Math.min(...visible.map((t) => t.price));
}

/** Eventos publicados para la landing, con sus tipos de entrada. */
export async function getPublishedEvents() {
  return db.sessionEvent.findMany({
    where: { status: { in: ["published", "sold_out"] } },
    orderBy: [{ featured: "desc" }, { date: "asc" }],
    include: {
      ticketTypes: { orderBy: { price: "asc" } },
    },
  });
}

/** Un evento por slug con sus tipos de entrada (solo visibles para público). */
export async function getEventBySlug(slug: string) {
  return db.sessionEvent.findUnique({
    where: { slug },
    include: {
      ticketTypes: {
        where: { status: { not: "hidden" } },
        orderBy: { price: "asc" },
      },
    },
  });
}

export type EventWithTickets = Awaited<ReturnType<typeof getPublishedEvents>>[number];
