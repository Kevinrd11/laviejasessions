import { db } from "@/lib/db";
import { Prisma, type DiscountCode } from "@/generated/prisma";

/** Normaliza el código: mayúsculas y sin espacios. */
export function normalizeCode(raw: string) {
  return (raw ?? "").toUpperCase().replace(/\s+/g, "");
}

export type CourtesyValidation =
  | { ok: true; code: DiscountCode }
  | { ok: false; error: string };

/**
 * Valida un código de cortesía para un evento (solo lectura, para previsualizar).
 * La reserva atómica se hace aparte al finalizar la solicitud.
 */
export async function validateCourtesyCode(
  rawCode: string,
  eventId: string,
): Promise<CourtesyValidation> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Código inválido." };

  const dc = await db.discountCode.findUnique({ where: { code } });
  if (!dc || dc.type !== "courtesy") return { ok: false, error: "Código inválido." };
  if (dc.eventId !== eventId) {
    return { ok: false, error: "Este código no aplica para este evento." };
  }
  if (!dc.isActive) return { ok: false, error: "Código inválido." };
  if (dc.usedCount >= dc.maxUses) {
    return { ok: false, error: "Este código de cortesía ya fue utilizado." };
  }
  if (dc.usedCount + dc.reservedCount >= dc.maxUses) {
    return {
      ok: false,
      error: "Este código de cortesía ya está reservado por otra solicitud.",
    };
  }
  return { ok: true, code: dc };
}

/**
 * Reserva el código de forma atómica (anti-doble-uso).
 * Devuelve el código reservado o lanza con un mensaje.
 * Pensado para maxUses = 1 (cortesías): solo reserva si está totalmente libre.
 */
export async function reserveCourtesyCode(
  tx: Prisma.TransactionClient,
  rawCode: string,
  eventId: string,
): Promise<DiscountCode> {
  const code = normalizeCode(rawCode);
  const dc = await tx.discountCode.findUnique({ where: { code } });
  if (!dc || dc.type !== "courtesy") throw new Error("Código inválido.");
  if (dc.eventId !== eventId) {
    throw new Error("Este código no aplica para este evento.");
  }
  if (!dc.isActive) throw new Error("Código inválido.");
  if (dc.usedCount >= dc.maxUses) {
    throw new Error("Este código de cortesía ya fue utilizado.");
  }

  // Reserva atómica: solo si nadie más lo tomó (used + reserved < maxUses).
  const reserved = await tx.discountCode.updateMany({
    where: { id: dc.id, isActive: true, usedCount: 0, reservedCount: 0 },
    data: { reservedCount: { increment: 1 } },
  });
  if (reserved.count === 0) {
    throw new Error("Este código de cortesía ya está reservado por otra solicitud.");
  }
  return dc;
}

/** Libera la reserva de un código (al cancelar/rechazar/expirar). */
export async function releaseCourtesyReservation(
  tx: Prisma.TransactionClient,
  codeId: string,
) {
  await tx.discountCode.updateMany({
    where: { id: codeId, reservedCount: { gt: 0 } },
    data: { reservedCount: { decrement: 1 } },
  });
}

/** Convierte la reserva en uso definitivo (al aprobar la cortesía). */
export async function consumeCourtesyCode(
  tx: Prisma.TransactionClient,
  codeId: string,
  assigned: { name: string; phone: string },
) {
  await tx.discountCode.update({
    where: { id: codeId },
    data: {
      usedCount: { increment: 1 },
      reservedCount: { decrement: 1 },
      assignedToName: assigned.name || null,
      assignedToPhone: assigned.phone || null,
    },
  });
}

/** Estado legible de un código para el panel admin. */
export function courtesyCodeState(
  c: Pick<DiscountCode, "isActive" | "usedCount" | "reservedCount" | "maxUses">,
): "usado" | "desactivado" | "reservado" | "disponible" {
  if (c.usedCount >= c.maxUses) return "usado";
  if (!c.isActive) return "desactivado";
  if (c.reservedCount > 0) return "reservado";
  return "disponible";
}
