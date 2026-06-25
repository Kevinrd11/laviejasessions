"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2, Phone, Mail, Gift } from "lucide-react";
import {
  adminConfirmPayment,
  adminCancelOrder,
  adminApproveCourtesy,
  adminRejectCourtesy,
} from "@/app/admin/actions";
import { formatColones } from "@/lib/utils";
import type { AdminOrder } from "@/lib/admin";

const statusMap: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Pendiente de pago", cls: "bg-warning/15 text-warning" },
  pending_courtesy: { label: "Cortesía pendiente", cls: "bg-gold/15 text-gold-soft" },
  paid: { label: "Pagada", cls: "bg-emerald/15 text-emerald-soft" },
  courtesy_approved: { label: "Cortesía aprobada", cls: "bg-emerald/15 text-emerald-soft" },
  cancelled: { label: "Cancelada", cls: "bg-danger/15 text-red-300" },
  expired: { label: "Vencida", cls: "bg-white/10 text-muted" },
};

type Filter = "pending_payment" | "pending_courtesy" | "all";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Costa_Rica",
  }).format(new Date(iso));
}

export function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState<Filter>("pending_payment");

  const filtered = orders.filter((o) =>
    filter === "all" ? true : o.status === filter,
  );

  const count = (s: string) => orders.filter((o) => o.status === s).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterBtn active={filter === "pending_payment"} onClick={() => setFilter("pending_payment")}>
          Pendientes de pago ({count("pending_payment")})
        </FilterBtn>
        <FilterBtn active={filter === "pending_courtesy"} onClick={() => setFilter("pending_courtesy")}>
          Cortesías pendientes ({count("pending_courtesy")})
        </FilterBtn>
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
          Todas ({orders.length})
        </FilterBtn>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl glass p-8 text-center text-muted">
          No hay órdenes en esta vista por ahora.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active ? "bg-emerald/20 text-emerald-soft" : "glass text-muted hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function OrderCard({ order }: { order: AdminOrder }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const st = statusMap[order.status] ?? statusMap.expired;
  const isCourtesy = order.status === "pending_courtesy";

  function run(fn: () => Promise<{ error?: string }>, confirmMsg: string) {
    if (!window.confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="rounded-2xl glass p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-widest text-gold-soft">
              {order.code}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
              {st.label}
            </span>
            {order.courtesyCode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold-soft">
                <Gift className="size-3" /> {order.courtesyCode}
              </span>
            )}
          </div>
          <p className="mt-1.5 font-semibold">{order.customerName}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Phone className="size-3" /> {order.customerPhone}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="size-3" /> {order.customerEmail}
            </span>
            {order.customerIdNumber && <span>Cédula: {order.customerIdNumber}</span>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {order.itemsSummary} · {fmtDate(order.createdAt)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted">{isCourtesy ? "Total final" : "Monto esperado"}</p>
          <p className="font-display text-lg font-bold text-foreground">
            {formatColones(order.total)}
          </p>
          <p className="text-xs text-muted">{order.quantity} entrada(s)</p>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      {/* Acciones según estado */}
      {order.status === "pending_courtesy" && (
        <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
          <button
            onClick={() =>
              run(
                () => adminApproveCourtesy(order.id),
                `¿Aprobar la cortesía ${order.code}? Esto descontará 1 entrada, marcará el código como usado y generará el QR.`,
              )
            }
            disabled={pending}
            className="btn-premium flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Aprobar cortesía
          </button>
          <button
            onClick={() =>
              run(() => adminRejectCourtesy(order.id), `¿Rechazar la cortesía ${order.code}? Se liberará el código.`)
            }
            disabled={pending}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-danger/40 px-4 text-sm font-semibold text-red-300 transition hover:bg-danger/10 disabled:opacity-50"
          >
            <X className="size-4" /> Rechazar
          </button>
        </div>
      )}

      {order.status === "pending_payment" && (
        <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
          <button
            onClick={() =>
              run(
                () => adminConfirmPayment(order.id),
                `¿Confirmar el pago de ${order.code}? Esto descontará ${order.quantity} entrada(s) y generará los QR.`,
              )
            }
            disabled={pending}
            className="btn-premium flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Confirmar pago
          </button>
          <button
            onClick={() => run(() => adminCancelOrder(order.id), `¿Cancelar la orden ${order.code}?`)}
            disabled={pending}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-danger/40 px-4 text-sm font-semibold text-red-300 transition hover:bg-danger/10 disabled:opacity-50"
          >
            <X className="size-4" /> Cancelar
          </button>
        </div>
      )}

      {(order.status === "paid" || order.status === "courtesy_approved") && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            onClick={() =>
              run(() => adminCancelOrder(order.id), `¿Cancelar ${order.code} y liberar la(s) entrada(s)?`)
            }
            disabled={pending}
            className="flex h-9 items-center justify-center gap-2 rounded-full border border-danger/40 px-4 text-sm font-semibold text-red-300 transition hover:bg-danger/10 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            Cancelar y liberar entradas
          </button>
        </div>
      )}
    </div>
  );
}
