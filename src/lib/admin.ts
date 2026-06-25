import { db } from "@/lib/db";
import { eventLimitedInventory } from "@/lib/sessions";

/** Datos agregados para el panel administrativo. */
export async function getAdminDashboard() {
  const events = await db.sessionEvent.findMany({
    orderBy: [{ featured: "desc" }, { date: "asc" }],
    include: {
      ticketTypes: true,
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: { include: { ticketType: true } } },
      },
    },
  });

  return events.map((event) => {
    const inv = eventLimitedInventory(event.ticketTypes);

    const qtyOf = (status: string) =>
      event.orders
        .filter((o) => o.status === status)
        .reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0);

    const paidQty = qtyOf("paid");
    const pendingQty = qtyOf("pending_payment");
    const pendingOrders = event.orders.filter(
      (o) => o.status === "pending_payment",
    ).length;

    const orders = event.orders.map((o) => ({
      id: o.id,
      code: o.code,
      customerName: o.customerName || "—",
      customerEmail: o.customerEmail || "—",
      customerPhone: o.customerPhone || "—",
      customerIdNumber: o.customerIdNumber,
      quantity: o.items.reduce((a, i) => a + i.quantity, 0),
      itemsSummary: o.items
        .map((i) => `${i.quantity}× ${i.ticketType.name}`)
        .join(", "),
      total: o.total,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }));

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      status: event.status,
      capacity: inv.totalCapacity, // capacidad con tope (ej. preventa 35)
      available: inv.available,
      percentSold: inv.percentSold,
      paidQty,
      pendingQty,
      pendingOrders,
      orders,
    };
  });
}

export type AdminEvent = Awaited<ReturnType<typeof getAdminDashboard>>[number];
export type AdminOrder = AdminEvent["orders"][number];
