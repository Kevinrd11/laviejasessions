import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { generateTicketCode, generateOrderCode } from "@/lib/services/qr";
import { ORDER_EXPIRY_HOURS, computeServiceFee } from "@/config/orders";
import {
  reserveCourtesyCode,
  releaseCourtesyReservation,
  consumeCourtesyCode,
  finalPriceFor,
} from "@/lib/services/courtesy";
import type { CreateOrderInput } from "@/lib/validations";

export class OrderError extends Error {}

/** Emite una entrada con QR único por cada unidad de la orden. */
async function issueTickets(
  tx: Prisma.TransactionClient,
  order: { id: string; eventId: string; customerName: string },
  items: { ticketTypeId: string; quantity: number }[],
) {
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      await tx.sessionTicket.create({
        data: {
          orderId: order.id,
          eventId: order.eventId,
          ticketTypeId: item.ticketTypeId,
          qrCode: generateTicketCode(),
          attendeeName: order.customerName,
          status: "valid",
        },
      });
    }
  }
}

/** Descuenta inventario de forma atómica (anti-sobreventa). Lanza si no hay cupo. */
async function decrementInventory(
  tx: Prisma.TransactionClient,
  items: { ticketTypeId: string; quantity: number; ticketType: { unlimited: boolean; quantityTotal: number } }[],
  soldOutMessage: string,
) {
  for (const item of items) {
    if (item.ticketType.unlimited) {
      await tx.sessionTicketType.update({
        where: { id: item.ticketTypeId },
        data: { quantitySold: { increment: item.quantity } },
      });
      continue;
    }
    const updated = await tx.sessionTicketType.updateMany({
      where: {
        id: item.ticketTypeId,
        quantitySold: { lte: item.ticketType.quantityTotal - item.quantity },
      },
      data: { quantitySold: { increment: item.quantity } },
    });
    if (updated.count === 0) throw new OrderError(soldOutMessage);
  }
}

/** Genera un código de orden único, reintentando si hay colisión. */
async function uniqueOrderCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    const existing = await tx.sessionOrder.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new OrderError("No se pudo generar el código de la orden. Intenta de nuevo.");
}

/**
 * Crea una orden en estado `pending_payment`.
 *
 * IMPORTANTE: NO descuenta entradas del inventario. El conteo público solo
 * considera órdenes `paid`. La validación de cupo aquí es solo para bloquear
 * cuando el evento ya está agotado (entradas pagadas == capacidad). La
 * verificación anti-sobreventa definitiva ocurre al confirmar el pago.
 */
export async function createOrder(input: CreateOrderInput) {
  return db.$transaction(async (tx) => {
    const event = await tx.sessionEvent.findUnique({
      where: { id: input.eventId },
      include: { ticketTypes: true },
    });

    if (!event) throw new OrderError("El evento no existe.");
    if (event.status !== "published") {
      throw new OrderError("Este evento no está disponible para la venta.");
    }

    let subtotal = 0;
    const itemsData: {
      ticketTypeId: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[] = [];

    const now = new Date();

    for (const item of input.items) {
      const tt = event.ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (!tt) throw new OrderError("Tipo de entrada inválido.");
      if (tt.status !== "active") {
        throw new OrderError(`"${tt.name}" no está disponible.`);
      }
      if (item.quantity < 1) {
        throw new OrderError("La cantidad debe ser mayor a 0.");
      }

      // Ventana de venta: bloqueada antes de salesStart / cerrada tras salesEnd.
      if (tt.salesStart && now.getTime() < tt.salesStart.getTime()) {
        throw new OrderError(
          `"${tt.name}" aún no está disponible. Se habilita el día del evento.`,
        );
      }
      if (tt.salesEnd && now.getTime() > tt.salesEnd.getTime()) {
        throw new OrderError(`La venta de "${tt.name}" ya cerró.`);
      }
      if (item.quantity > tt.maxPerOrder) {
        throw new OrderError(
          `Máximo ${tt.maxPerOrder} por orden para "${tt.name}".`,
        );
      }

      // Bloqueo por agotado: quantitySold refleja SOLO entradas pagadas.
      if (!tt.unlimited) {
        const remaining = tt.quantityTotal - tt.quantitySold;
        if (remaining <= 0) {
          throw new OrderError(
            `"${tt.name}" está agotada. Este evento ya no tiene entradas disponibles.`,
          );
        }
        if (item.quantity > remaining) {
          throw new OrderError(
            `Solo quedan ${remaining} entradas de "${tt.name}". Reducí la cantidad.`,
          );
        }
      }

      const lineTotal = tt.price * item.quantity;
      subtotal += lineTotal;
      itemsData.push({
        ticketTypeId: tt.id,
        quantity: item.quantity,
        unitPrice: tt.price,
        total: lineTotal,
      });
    }

    const serviceFee = computeServiceFee(subtotal);
    const total = subtotal + serviceFee;
    // Ventana de "limpieza": si nunca se paga, el cron la marca expired.
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_HOURS * 60 * 60 * 1000);
    const code = await uniqueOrderCode(tx);

    const order = await tx.sessionOrder.create({
      data: {
        code,
        eventId: event.id,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        status: "pending_payment",
        subtotal,
        serviceFee,
        total,
        expiresAt,
        items: { create: itemsData },
      },
    });

    return { orderId: order.id, code: order.code, total };
  });
}

/** Libera el inventario de una orden pagada (al cancelarla). */
async function releasePaidSeats(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.sessionOrderItem.findMany({ where: { orderId } });
  for (const item of items) {
    await tx.sessionTicketType.update({
      where: { id: item.ticketTypeId },
      data: { quantitySold: { decrement: item.quantity } },
    });
  }
}

/**
 * Marca como `expired` las órdenes pendientes viejas (limpieza). No toca el
 * inventario (las pendientes nunca lo descontaron), pero libera las reservas
 * de códigos de cortesía.
 */
export async function expirePendingOrders() {
  const stale = await db.sessionOrder.findMany({
    where: {
      status: { in: ["pending_payment", "pending_courtesy"] },
      expiresAt: { lt: new Date() },
    },
    select: { id: true, status: true, discountCodeId: true },
  });

  for (const o of stale) {
    await db.$transaction(async (tx) => {
      if (o.status === "pending_courtesy" && o.discountCodeId) {
        await releaseCourtesyReservation(tx, o.discountCodeId);
      }
      await tx.sessionOrder.update({
        where: { id: o.id },
        data: { status: "expired" },
      });
    });
  }
  return stale.length;
}

/**
 * CONFIRMACIÓN MANUAL DEL PAGO (acción del administrador).
 *
 * Valida de forma atómica que aún haya cupo, descuenta el inventario,
 * genera las entradas con QR y deja la orden en `paid`.
 * Es el ÚNICO punto donde el inventario disminuye.
 */
export async function confirmPayment(
  orderId: string,
  opts?: { paymentReference?: string },
) {
  return db.$transaction(async (tx) => {
    const order = await tx.sessionOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: { ticketType: true } }, tickets: true },
    });
    if (!order) throw new OrderError("Orden no encontrada.");
    if (order.status === "paid") {
      return order; // ya confirmada (idempotente)
    }
    if (order.status !== "pending_payment") {
      throw new OrderError("Solo se pueden confirmar órdenes pendientes de pago.");
    }

    await decrementInventory(
      tx,
      order.items,
      "No se puede confirmar esta orden porque no quedan suficientes entradas para el evento.",
    );

    // Si la orden usó un código de descuento, consumirlo definitivamente.
    if (order.discountCodeId) {
      await consumeCourtesyCode(tx, order.discountCodeId, {
        name: order.customerName,
        phone: order.customerPhone,
      });
    }

    await issueTickets(tx, order, order.items);

    return tx.sessionOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paymentReference: opts?.paymentReference ?? order.paymentReference,
        expiresAt: null,
      },
    });
  });
}

/**
 * Cancela una orden.
 * - paid / courtesy_approved: libera inventario y cancela las entradas.
 * - courtesy_approved: además restituye el código de cortesía (queda usable).
 * - pending_courtesy: libera la reserva del código.
 * - pending_payment: solo cambia el estado (no había inventario).
 */
export async function cancelOrder(orderId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.sessionOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new OrderError("Orden no encontrada.");
    if (order.status === "cancelled") return order;

    if (order.status === "paid" || order.status === "courtesy_approved") {
      await releasePaidSeats(tx, orderId);
      await tx.sessionTicket.updateMany({
        where: { orderId },
        data: { status: "cancelled" },
      });
    }

    if (order.discountCodeId) {
      if (order.status === "pending_courtesy" || order.status === "pending_payment") {
        // Aún no se había consumido: liberar la reserva del código.
        await releaseCourtesyReservation(tx, order.discountCodeId);
      } else if (order.status === "courtesy_approved" || order.status === "paid") {
        // Ya estaba consumido: restituir el uso para que pueda volver a usarse.
        await tx.discountCode.updateMany({
          where: { id: order.discountCodeId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
    }

    return tx.sessionOrder.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });
  });
}

/**
 * Aplica un código de cortesía a una orden existente (al finalizar el checkout).
 * Reserva el código de forma atómica y deja la orden en `pending_courtesy`
 * con total ₡0. NO descuenta inventario (eso ocurre al aprobar).
 * Requiere que la orden sea de exactamente 1 entrada.
 */
export async function applyCourtesyToOrder(orderId: string, rawCode: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.sessionOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new OrderError("Orden no encontrada.");
    if (order.status !== "pending_payment") {
      throw new OrderError("Esta solicitud ya fue procesada.");
    }
    const qty = order.items.reduce((s, i) => s + i.quantity, 0);
    if (qty !== 1) {
      throw new OrderError("El código de cortesía aplica solo para 1 entrada.");
    }

    let code;
    try {
      code = await reserveCourtesyCode(tx, rawCode, order.eventId);
    } catch (e) {
      throw new OrderError(e instanceof Error ? e.message : "Código inválido.");
    }

    // Precio final con el código. ₡0 → cortesía (aprobación manual);
    // > ₡0 → descuento (sigue el flujo de pago por SINPE).
    const finalTotal = finalPriceFor(code, order.subtotal);
    const isFree = finalTotal <= 0;

    return tx.sessionOrder.update({
      where: { id: order.id },
      data: {
        status: isFree ? "pending_courtesy" : "pending_payment",
        discountCodeId: code.id,
        discountTotal: order.subtotal - finalTotal,
        total: finalTotal,
        expiresAt: new Date(Date.now() + ORDER_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });
  });
}

/**
 * APROBAR CORTESÍA (admin). Valida cupo, descuenta inventario, marca el
 * código como usado y emite las entradas con QR. Deja `courtesy_approved`.
 */
export async function approveCourtesyOrder(orderId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.sessionOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: { ticketType: true } }, tickets: true },
    });
    if (!order) throw new OrderError("Orden no encontrada.");
    if (order.status === "courtesy_approved") return order; // idempotente
    if (order.status !== "pending_courtesy") {
      throw new OrderError("Esta orden no es una cortesía pendiente.");
    }

    await decrementInventory(
      tx,
      order.items,
      "No se puede aprobar esta cortesía porque el evento ya está agotado.",
    );

    if (order.discountCodeId) {
      await consumeCourtesyCode(tx, order.discountCodeId, {
        name: order.customerName,
        phone: order.customerPhone,
      });
    }

    await issueTickets(tx, order, order.items);

    return tx.sessionOrder.update({
      where: { id: order.id },
      data: { status: "courtesy_approved", expiresAt: null },
    });
  });
}

/**
 * RECHAZAR CORTESÍA (admin). Cancela la orden y libera el código para que
 * pueda volver a usarse. No descuenta inventario.
 */
export async function rejectCourtesyOrder(orderId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.sessionOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new OrderError("Orden no encontrada.");
    if (order.status !== "pending_courtesy") {
      throw new OrderError("Esta orden no es una cortesía pendiente.");
    }
    if (order.discountCodeId) {
      await releaseCourtesyReservation(tx, order.discountCodeId);
    }
    return tx.sessionOrder.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });
  });
}

/** Carga una orden con todo lo necesario para checkout/success. */
export async function getOrderFull(orderId: string) {
  return db.sessionOrder.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      items: { include: { ticketType: true } },
      tickets: { include: { ticketType: true }, orderBy: { createdAt: "asc" } },
    },
  });
}
