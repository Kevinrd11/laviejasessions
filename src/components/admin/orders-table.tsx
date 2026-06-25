"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2, Phone, Mail } from "lucide-react";
import { adminConfirmPayment, adminCancelOrder } from "@/app/admin/actions";
import { formatColones } from "@/lib/utils";
import type { AdminOrder } from "@/lib/admin";

const statusMap: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Pendiente de pago", cls: "bg-warning/15 text-warning" },
  paid: { label: "Pagada", cls: "bg-emerald/15 text-emerald-soft" },
  cancelled: { label: "Cancelada", cls: "bg-danger/15 text-red-300" },
  expired: { label: "Vencida", cls: "bg-white/10 text-muted" },
};

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
  const [filter, setFilter] = useState<"pending_payment" | "all">("pending_payment");

  const filtered = orders.filter((o) =>
    filter === "all" ? true : o.status === "pending_payment",
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <FilterBtn active={filter === "pending_payment"} onClick={() => setFilter("pending_payment")}>
          Pendientes ({orders.filter((o) => o.status === "pending_payment").length})
        </FilterBtn>
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
          Todas ({orders.length})
        </FilterBtn>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl glass p-8 text-center text-muted">
          No hay órdenes {filter === "pending_payment" ? "pendientes" : ""} por ahora.
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

  function confirm() {
    if (!window.confirm(`¿Confirmar el pago de la orden ${order.code}? Esto descontará ${order.quantity} entrada(s) y generará los QR.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await adminConfirmPayment(order.id);
      if (res?.error) setError(res.error);
    });
  }

  function cancel() {
    if (!window.confirm(`¿Cancelar la orden ${order.code}?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await adminCancelOrder(order.id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="rounded-2xl glass p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-widest text-gold-soft">
              {order.code}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
              {st.label}
            </span>
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
          <p className="text-xs text-muted">Monto esperado</p>
          <p className="font-display text-lg font-bold text-foreground">
            {formatColones(order.total)}
          </p>
          <p className="text-xs text-muted">{order.quantity} entrada(s)</p>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      {order.status === "pending_payment" && (
        <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
          <button
            onClick={confirm}
            disabled={pending}
            className="btn-premium flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Confirmar pago
          </button>
          <button
            onClick={cancel}
            disabled={pending}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-danger/40 px-4 text-sm font-semibold text-red-300 transition hover:bg-danger/10 disabled:opacity-50"
          >
            <X className="size-4" /> Cancelar
          </button>
        </div>
      )}

      {order.status === "paid" && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            onClick={cancel}
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
