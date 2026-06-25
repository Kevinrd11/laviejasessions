import { db } from "@/lib/db";
import { eventLimitedInventory } from "@/lib/sessions";
import { courtesyCodeState } from "@/lib/services/courtesy";

/** Datos agregados para el panel administrativo. */
export async function getAdminDashboard() {
  const events = await db.sessionEvent.findMany({
    orderBy: [{ featured: "desc" }, { date: "asc" }],
    include: {
      ticketTypes: true,
      discountCodes: { orderBy: { code: "asc" } },
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

    const codeById = new Map(event.discountCodes.map((c) => [c.id, c.code]));

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
      courtesyCode: o.discountCodeId ? codeById.get(o.discountCodeId) ?? null : null,
      createdAt: o.createdAt.toISOString(),
    }));

    // Para cada código: orden/cliente asociado y fecha de uso (orden aprobada).
    const codes = event.discountCodes.map((c) => {
      const related = event.orders.find(
        (o) =>
          o.discountCodeId === c.id &&
          (o.status === "pending_courtesy" || o.status === "courtesy_approved"),
      );
      const approved = event.orders.find(
        (o) => o.discountCodeId === c.id && o.status === "courtesy_approved",
      );
      return {
        id: c.id,
        code: c.code,
        state: courtesyCodeState(c),
        isActive: c.isActive,
        assignedToName: c.assignedToName ?? related?.customerName ?? null,
        orderCode: related?.code ?? null,
        usedAt: approved ? approved.createdAt.toISOString() : null,
      };
    });

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      status: event.status,
      capacity: inv.totalCapacity,
      available: inv.available,
      percentSold: inv.percentSold,
      paidQty: qtyOf("paid"),
      courtesyApprovedQty: qtyOf("courtesy_approved"),
      pendingOrders: event.orders.filter((o) => o.status === "pending_payment").length,
      pendingCourtesy: event.orders.filter((o) => o.status === "pending_courtesy").length,
      orders,
      codes,
    };
  });
}

export type AdminEvent = Awaited<ReturnType<typeof getAdminDashboard>>[number];
export type AdminOrder = AdminEvent["orders"][number];
export type AdminCode = AdminEvent["codes"][number];
