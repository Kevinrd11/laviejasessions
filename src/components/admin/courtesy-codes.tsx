"use client";

import { useTransition } from "react";
import { Loader2, Power, Gift } from "lucide-react";
import { adminToggleCode } from "@/app/admin/actions";
import type { AdminCode } from "@/lib/admin";

const stateMap: Record<string, { label: string; cls: string }> = {
  disponible: { label: "Disponible", cls: "bg-emerald/15 text-emerald-soft" },
  reservado: { label: "Reservado", cls: "bg-warning/15 text-warning" },
  usado: { label: "Usado", cls: "bg-white/10 text-muted" },
  desactivado: { label: "Desactivado", cls: "bg-danger/15 text-red-300" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Costa_Rica",
  }).format(new Date(iso));
}

export function CourtesyCodes({ codes }: { codes: AdminCode[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        {codes.filter((c) => c.state === "disponible").length} disponibles ·{" "}
        {codes.filter((c) => c.state === "usado").length} usados ·{" "}
        {codes.filter((c) => c.state === "reservado").length} reservados
      </p>
      <div className="overflow-x-auto rounded-2xl glass">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Persona</th>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Fecha de uso</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <CodeRow key={c.id} code={c} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CodeRow({ code }: { code: AdminCode }) {
  const [pending, startTransition] = useTransition();
  const st = stateMap[code.state] ?? stateMap.disponible;

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 font-mono font-semibold text-gold-soft">
          <Gift className="size-3.5" /> {code.code}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
          {st.label}
        </span>
      </td>
      <td className="px-4 py-3 text-muted">{code.assignedToName ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-xs text-muted">{code.orderCode ?? "—"}</td>
      <td className="px-4 py-3 text-muted">{fmtDate(code.usedAt)}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => startTransition(async () => { await adminToggleCode(code.id); })}
          disabled={pending || code.state === "usado"}
          title={code.state === "usado" ? "No se puede cambiar un código usado" : ""}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
            code.isActive
              ? "border-danger/40 text-red-300 hover:bg-danger/10"
              : "border-emerald/40 text-emerald-soft hover:bg-emerald/10"
          }`}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
          {code.isActive ? "Desactivar" : "Activar"}
        </button>
      </td>
    </tr>
  );
}
