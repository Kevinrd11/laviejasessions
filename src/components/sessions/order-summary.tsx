import { formatColones } from "@/lib/utils";

export type SummaryLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

/** Resumen de compra reutilizable (selector y checkout). */
export function SessionOrderSummary({
  lines,
  serviceFee = 0,
  compact = false,
}: {
  lines: SummaryLine[];
  serviceFee?: number;
  compact?: boolean;
}) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = subtotal + serviceFee;
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="space-y-3">
      {!compact && (
        <h3 className="font-display text-lg font-semibold">Resumen de compra</h3>
      )}

      {count === 0 ? (
        <p className="text-sm text-muted">No has seleccionado entradas.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {lines
            .filter((l) => l.quantity > 0)
            .map((l) => (
              <li key={l.name} className="flex justify-between gap-3 text-muted">
                <span>
                  {l.quantity} × {l.name}
                </span>
                <span className="text-foreground">
                  {formatColones(l.unitPrice * l.quantity)}
                </span>
              </li>
            ))}
        </ul>
      )}

      <div className="space-y-2 border-t border-white/10 pt-3 text-sm">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="text-foreground">{formatColones(subtotal)}</span>
        </div>
        {serviceFee > 0 && (
          <div className="flex justify-between text-muted">
            <span>Comisión de servicio</span>
            <span className="text-foreground">{formatColones(serviceFee)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-white/10 pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="text-gold-soft">{formatColones(total)}</span>
        </div>
      </div>
    </div>
  );
}
