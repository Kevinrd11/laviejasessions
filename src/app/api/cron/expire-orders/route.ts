import { NextRequest, NextResponse } from "next/server";
import { expirePendingOrders } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

/**
 * Expira órdenes pendientes vencidas y libera sus cupos.
 * Vercel Cron lo invoca según la programación de vercel.json.
 * Protegido con CRON_SECRET (Vercel envía el header Authorization).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const expired = await expirePendingOrders();
  return NextResponse.json({ ok: true, expired });
}
