"use client";

import { useMemo, useState, useTransition } from "react";
import { Minus, Plus, Ticket, Loader2, AlertCircle, Lock } from "lucide-react";
import { SessionOrderSummary } from "./order-summary";
import { createOrderAction } from "@/app/sessions/actions";
import { SERVICE_FEE_RATE } from "@/config/orders";
import { formatColones } from "@/lib/utils";

export type SelectableTicket = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxPerOrder: number;
  unlimited: boolean;
  available: number; // relevante solo para entradas con tope
  soldOut: boolean;
  locked: boolean; // aún no abre la venta (ej. día del evento)
  lockedUntilLabel: string | null;
};

function capFor(t: SelectableTicket) {
  if (t.locked || t.soldOut) return 0;
  return t.unlimited ? t.maxPerOrder : Math.min(t.maxPerOrder, t.available);
}

export function SessionTicketSelector({
  eventId,
  tickets,
}: {
  eventId: string;
  tickets: SelectableTicket[];
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lines = useMemo(
    () =>
      tickets.map((t) => ({
        name: t.name,
        quantity: qty[t.id] ?? 0,
        unitPrice: t.price,
      })),
    [tickets, qty],
  );

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const totalCount = lines.reduce((s, l) => s + l.quantity, 0);

  function setTicketQty(t: SelectableTicket, next: number) {
    const cap = capFor(t);
    const clamped = Math.max(0, Math.min(next, cap));
    setQty((prev) => ({ ...prev, [t.id]: clamped }));
  }

  function handleBuy() {
    setError(null);
    const items = tickets
      .map((t) => ({ ticketTypeId: t.id, quantity: qty[t.id] ?? 0 }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      setError("Selecciona al menos una entrada.");
      return;
    }

    startTransition(async () => {
      const res = await createOrderAction({ eventId, items });
      // Si todo va bien, createOrderAction hace redirect y no retorna.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {tickets.map((t) => {
          const current = qty[t.id] ?? 0;
          const cap = capFor(t);
          return (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-4 rounded-2xl glass p-4 ${
                t.locked ? "opacity-80" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Ticket className="size-4 text-gold-soft" />
                  <h4 className="font-semibold">{t.name}</h4>
                  {t.locked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-muted">
                      <Lock className="size-3" /> Día del evento
                    </span>
                  )}
                  {!t.locked && t.soldOut && (
                    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-red-300">
                      Agotado
                    </span>
                  )}
                  {!t.locked && !t.soldOut && t.unlimited && (
                    <span className="rounded-full bg-emerald/15 px-2 py-0.5 text-xs font-semibold text-emerald-soft">
                      Disponible
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="mt-1 text-sm text-muted">{t.description}</p>
                )}
                <p className="mt-1 font-display text-base font-bold text-gold-soft">
                  {formatColones(t.price)}
                </p>
                {t.locked && t.lockedUntilLabel && (
                  <p className="mt-0.5 text-xs text-muted">
                    Se habilita el día del evento ({t.lockedUntilLabel}).
                  </p>
                )}
                {!t.locked && !t.soldOut && !t.unlimited && t.available <= 10 && (
                  <p className="mt-0.5 text-xs text-warning">
                    {t.available <= 5 ? "¡Casi agotado!" : "¡Últimas entradas!"} Quedan{" "}
                    {t.available}.
                  </p>
                )}
              </div>

              {t.locked ? (
                <span className="flex items-center gap-1 text-sm text-muted">
                  <Lock className="size-4" />
                </span>
              ) : t.soldOut ? (
                <span className="text-sm text-muted">—</span>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Quitar"
                    disabled={current <= 0}
                    onClick={() => setTicketQty(t, current - 1)}
                    className="flex size-9 items-center justify-center rounded-full border border-white/10 transition hover:bg-white/5 disabled:opacity-30"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-6 text-center font-semibold tabular-nums">
                    {current}
                  </span>
                  <button
                    type="button"
                    aria-label="Agregar"
                    disabled={current >= cap}
                    onClick={() => setTicketQty(t, current + 1)}
                    className="flex size-9 items-center justify-center rounded-full border border-emerald/30 text-emerald-soft transition hover:bg-emerald/10 disabled:opacity-30"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl glass-strong p-5">
        <SessionOrderSummary lines={lines} serviceFee={serviceFee} />

        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-300">
            <AlertCircle className="size-4" />
            {error}
          </p>
        )}

        <button
          onClick={handleBuy}
          disabled={pending || totalCount === 0}
          className="btn-premium mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold text-white disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Procesando…
            </>
          ) : (
            <>Comprar entradas</>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          Reservamos tus cupos por 15 minutos mientras completas el pago.
        </p>
      </div>
    </div>
  );
}
