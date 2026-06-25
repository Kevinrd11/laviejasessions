"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import {
  loginWithCredentials,
  startSession,
  endSession,
  requireAdmin,
} from "@/lib/auth";
import {
  confirmPayment,
  cancelOrder,
  approveCourtesyOrder,
  rejectCourtesyOrder,
  OrderError,
} from "@/lib/services/orders";

export type AdminActionState = { error?: string };

/** Inicia sesión de administrador. */
export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AdminActionState> {
  const email = (input.email ?? "").trim();
  const password = input.password ?? "";
  if (!email || !password) return { error: "Ingresa tu correo y contraseña." };

  const user = await loginWithCredentials(email, password);
  if (!user) return { error: "Credenciales inválidas." };

  await startSession(user.id);
  redirect("/admin/sessions");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

async function audit(
  adminUserId: string,
  action: string,
  entityId: string,
  meta?: Prisma.InputJsonValue,
) {
  await db.adminAuditLog.create({
    data: { adminUserId, action, entity: "order", entityId, meta: meta ?? {} },
  });
}

/** Confirma el pago de una orden (descuenta inventario y emite entradas). */
export async function adminConfirmPayment(orderId: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  try {
    await confirmPayment(orderId, { paymentReference: `ADMIN-${admin.name}` });
    await audit(admin.id, "order.confirm_payment", orderId);
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("adminConfirmPayment", e);
    return { error: "No se pudo confirmar el pago." };
  }
  revalidatePath("/admin/sessions");
  return {};
}

/** Cancela una orden (libera inventario si estaba pagada). */
export async function adminCancelOrder(orderId: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  try {
    await cancelOrder(orderId);
    await audit(admin.id, "order.cancel", orderId);
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("adminCancelOrder", e);
    return { error: "No se pudo cancelar la orden." };
  }
  revalidatePath("/admin/sessions");
  return {};
}

/** Aprueba una cortesía (descuenta inventario, marca el código usado, emite QR). */
export async function adminApproveCourtesy(orderId: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  try {
    await approveCourtesyOrder(orderId);
    await audit(admin.id, "courtesy.approve", orderId);
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("adminApproveCourtesy", e);
    return { error: "No se pudo aprobar la cortesía." };
  }
  revalidatePath("/admin/sessions");
  return {};
}

/** Rechaza una cortesía (cancela la orden y libera el código). */
export async function adminRejectCourtesy(orderId: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  try {
    await rejectCourtesyOrder(orderId);
    await audit(admin.id, "courtesy.reject", orderId);
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("adminRejectCourtesy", e);
    return { error: "No se pudo rechazar la cortesía." };
  }
  revalidatePath("/admin/sessions");
  return {};
}

/** Activa o desactiva un código de cortesía. */
export async function adminToggleCode(codeId: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const code = await db.discountCode.findUnique({ where: { id: codeId } });
  if (!code) return { error: "Código no encontrado." };
  await db.discountCode.update({
    where: { id: codeId },
    data: { isActive: !code.isActive },
  });
  await db.adminAuditLog.create({
    data: {
      adminUserId: admin.id,
      action: code.isActive ? "code.deactivate" : "code.activate",
      entity: "discount_code",
      entityId: codeId,
    },
  });
  revalidatePath("/admin/sessions");
  return {};
}
