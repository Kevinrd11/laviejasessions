import { db } from "@/lib/db";
import type { SessionTicketType } from "@/generated/prisma";

/** Cupos disponibles de un tipo de entrada (total - vendidos/reservados). */
export function availableQuantity(t: Pick<SessionTicketType, "quantityTotal" | "quantitySold">) {
  return Math.max(0, t.quantityTotal - t.quantitySold);
}

export function isTicketTypeSoldOut(
  t: Pick<SessionTicketType, "quantityTotal" | "quantitySold" | "status">,
) {
  return t.status === "sold_out" || availableQuantity(t) <= 0;
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
