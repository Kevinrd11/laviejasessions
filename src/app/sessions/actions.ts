"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createOrder,
  getOrderFull,
  applyCourtesyToOrder,
  OrderError,
} from "@/lib/services/orders";
import { validateCourtesyCode, finalPriceFor } from "@/lib/services/courtesy";
import { createOrderSchema, checkoutSchema } from "@/lib/validations";

export type ActionState = { error?: string };

/** Crea la orden (pending_payment, sin descontar inventario) y lleva al checkout. */
export async function createOrderAction(input: unknown): Promise<ActionState> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let orderId: string;
  try {
    const result = await createOrder(parsed.data);
    orderId = result.orderId;
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("createOrder error", e);
    return { error: "No se pudo crear la orden. Intenta de nuevo." };
  }

  redirect(`/sessions/checkout?order=${orderId}`);
}

export type CourtesyPreview =
  | { ok: true; original: number; discount: number; total: number }
  | { ok: false; error: string };

/** Valida un código de cortesía para previsualizar el descuento (no reserva). */
export async function applyCourtesyAction(input: {
  orderId: string;
  code: string;
}): Promise<CourtesyPreview> {
  const order = await getOrderFull(input.orderId);
  if (!order) return { ok: false, error: "Orden no encontrada." };
  if (order.status !== "pending_payment") {
    return { ok: false, error: "Esta solicitud ya fue procesada." };
  }
  const qty = order.items.reduce((s, i) => s + i.quantity, 0);
  if (qty !== 1) {
    return { ok: false, error: "El código de cortesía aplica solo para 1 entrada." };
  }

  const res = await validateCourtesyCode(input.code, order.eventId);
  if (!res.ok) return { ok: false, error: res.error };

  const total = finalPriceFor(res.code, order.subtotal);
  return {
    ok: true,
    original: order.subtotal,
    discount: order.subtotal - total,
    total,
  };
}

/**
 * Guarda los datos del comprador y registra la solicitud.
 * - Con código de cortesía válido: orden `pending_courtesy`, total ₡0.
 * - Sin código: orden `pending_payment` (pago por SINPE manual).
 * En ambos casos NO se descuenta inventario (eso ocurre al aprobar/confirmar).
 */
export async function confirmCheckoutAction(input: unknown): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }
  const data = parsed.data;

  const order = await getOrderFull(data.orderId);
  if (!order) return { error: "Orden no encontrada." };
  if (order.status !== "pending_payment") {
    return { error: "Esta solicitud ya fue procesada." };
  }

  await db.sessionOrder.update({
    where: { id: order.id },
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerIdNumber: data.customerIdNumber || null,
      paymentMethod: data.paymentMethod,
    },
  });

  const courtesy = (data.courtesyCode ?? "").trim();
  let finalTotal = order.total;
  let needsPayment = true;

  if (courtesy) {
    // Aplicar el código: reserva atómica y ajusta el total.
    // ₡0 → pending_courtesy (sin pago); > ₡0 → pending_payment (SINPE por el monto con descuento).
    try {
      const updated = await applyCourtesyToOrder(order.id, courtesy);
      finalTotal = updated.total;
      needsPayment = updated.status === "pending_payment";
    } catch (e) {
      if (e instanceof OrderError) return { error: e.message };
      console.error("applyCourtesy error", e);
      return { error: "No se pudo aplicar el código de descuento." };
    }
  }

  if (needsPayment) {
    // Registrar intento de pago por SINPE (pendiente de validación manual).
    await db.sessionPayment.create({
      data: {
        orderId: order.id,
        provider: "sinpe",
        status: "pending",
        amount: finalTotal,
        currency: "CRC",
      },
    });
  }

  redirect(`/sessions/success?order=${order.id}`);
}
