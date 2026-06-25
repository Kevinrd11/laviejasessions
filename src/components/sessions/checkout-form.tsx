"use client";

import { useState, useTransition } from "react";
import {
  User,
  Mail,
  Phone,
  IdCard,
  Loader2,
  AlertCircle,
  Smartphone,
  CreditCard,
  Gift,
  Check,
  X,
} from "lucide-react";
import { confirmCheckoutAction, applyCourtesyAction } from "@/app/sessions/actions";
import { brand } from "@/config/brand";
import { formatColones } from "@/lib/utils";

type Method = "sinpe" | "card";

const methods: {
  id: Method;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}[] = [
  {
    id: "sinpe",
    label: "SINPE Móvil",
    desc: "Transfiere y envía el comprobante. Validamos tu pago manualmente.",
    icon: Smartphone,
  },
  {
    id: "card",
    label: "Tarjeta / Link de pago",
    desc: "No disponible por el momento.",
    icon: CreditCard,
    disabled: true,
  },
];

type Applied = { code: string; original: number; discount: number; total: number };

export function SessionCheckoutForm({
  orderId,
  orderCode,
  orderTotal,
}: {
  orderId: string;
  orderCode: string;
  orderTotal: number;
}) {
  const [method, setMethod] = useState<Method>("sinpe");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Cortesía
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [courtesyError, setCourtesyError] = useState<string | null>(null);
  const [applying, startApplying] = useTransition();

  const isApplied = applied !== null;
  const isFree = applied?.total === 0; // ₡0 = cortesía (sin pago)
  const payable = applied ? applied.total : orderTotal;

  function applyCode() {
    setCourtesyError(null);
    const code = codeInput.toUpperCase().replace(/\s+/g, "");
    if (!code) {
      setCourtesyError("Ingresá tu código.");
      return;
    }
    startApplying(async () => {
      const res = await applyCourtesyAction({ orderId, code });
      if (res.ok) {
        setApplied({ code, original: res.original, discount: res.discount, total: res.total });
      } else {
        setCourtesyError(res.error);
      }
    });
  }

  function removeCode() {
    setApplied(null);
    setCodeInput("");
    setCourtesyError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    if (!accept) {
      setError("Debes aceptar los términos para continuar.");
      return;
    }

    const payload = {
      orderId,
      customerName: String(fd.get("customerName") ?? ""),
      customerEmail: String(fd.get("customerEmail") ?? ""),
      customerPhone: String(fd.get("customerPhone") ?? ""),
      customerIdNumber: String(fd.get("customerIdNumber") ?? ""),
      paymentMethod: method,
      courtesyCode: applied?.code,
      acceptTerms: true as const,
    };

    startTransition(async () => {
      const res = await confirmCheckoutAction(payload);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos del comprador */}
      <fieldset className="space-y-4" disabled={pending}>
        <legend className="mb-2 font-display text-lg font-semibold">Tus datos</legend>
        <Field icon={User} name="customerName" label="Nombre completo" required placeholder="Nombre y apellidos" />
        <Field icon={Mail} name="customerEmail" type="email" label="Correo electrónico" required placeholder="tucorreo@ejemplo.com" />
        <Field icon={Phone} name="customerPhone" label="WhatsApp" required placeholder="8888 8888" />
        <Field icon={IdCard} name="customerIdNumber" label="Cédula (opcional)" placeholder="1 2345 6789" />
      </fieldset>

      {/* Código de cortesía */}
      <fieldset className="space-y-3" disabled={pending}>
        <legend className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
          <Gift className="size-5 text-gold-soft" /> ¿Tenés un código de descuento?
        </legend>

        {!isApplied ? (
          <>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Ingresá tu código"
                disabled={applying}
                className="h-11 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-sm uppercase tracking-wider outline-none focus:border-emerald/50"
              />
              <button
                type="button"
                onClick={applyCode}
                disabled={applying}
                className="flex h-11 items-center gap-2 rounded-xl border border-emerald/40 px-4 text-sm font-semibold text-emerald-soft transition hover:bg-emerald/10 disabled:opacity-50"
              >
                {applying ? <Loader2 className="size-4 animate-spin" /> : null}
                Aplicar código
              </button>
            </div>
            {courtesyError && (
              <p className="flex items-center gap-2 text-sm text-red-300">
                <AlertCircle className="size-4" /> {courtesyError}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3 rounded-2xl border border-emerald/30 bg-emerald/10 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-soft">
                <Check className="size-4" /> Código de descuento aplicado correctamente.
              </p>
              <button
                type="button"
                onClick={removeCode}
                className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
              >
                <X className="size-3.5" /> Quitar
              </button>
            </div>
            <div className="space-y-1 text-sm">
              <Row label="Precio original" value={formatColones(applied!.original)} />
              <Row label={`Descuento (${applied!.code})`} value={`-${formatColones(applied!.discount)}`} tone="text-emerald-soft" />
              <div className="flex justify-between border-t border-white/10 pt-1.5 text-base font-bold">
                <span>Total a pagar</span>
                <span className="text-gold-soft">{formatColones(applied!.total)}</span>
              </div>
            </div>
          </div>
        )}
      </fieldset>

      {/* Método de pago (oculto si la entrada queda en ₡0) */}
      {!isFree && (
        <fieldset className="space-y-3" disabled={pending}>
          <legend className="mb-2 font-display text-lg font-semibold">Método de pago</legend>
          {methods.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            const disabled = m.disabled;
            return (
              <label
                key={m.id}
                aria-disabled={disabled}
                className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                  disabled
                    ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-60"
                    : active
                      ? "cursor-pointer border-emerald/50 bg-emerald/10"
                      : "cursor-pointer border-white/10 glass hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m.id}
                  checked={active}
                  disabled={disabled}
                  onChange={() => !disabled && setMethod(m.id)}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    active && !disabled ? "bg-emerald/20 text-emerald-soft" : "bg-white/5 text-muted"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    {m.label}
                    {disabled && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-muted">
                        No disponible
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-muted">{m.desc}</span>
                </span>
              </label>
            );
          })}

          {method === "sinpe" && (
            <div className="space-y-3 rounded-2xl bg-white/5 p-4 text-sm text-muted">
              <p className="font-medium text-foreground">Instrucciones SINPE Móvil</p>
              <ol className="list-decimal space-y-1.5 pl-4">
                <li>
                  Transfiere{" "}
                  <strong className="text-foreground">{formatColones(payable)}</strong> por
                  SINPE Móvil al{" "}
                  <strong className="text-emerald-soft">{brand.sinpeDisplay}</strong> ({brand.company}).
                </li>
                <li>
                  <strong className="text-foreground">Importante:</strong> en la{" "}
                  <strong className="text-foreground">descripción / detalle</strong> del comprobante escribe tu código de orden.
                </li>
                <li>Envíanos el comprobante por WhatsApp para validar tu pago.</li>
              </ol>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Código de tu orden</p>
                  <p className="font-mono text-lg font-bold tracking-widest text-emerald-soft">{orderCode}</p>
                </div>
                <span className="text-right text-xs text-muted">
                  Escríbelo en la
                  <br />
                  descripción del SINPE
                </span>
              </div>
            </div>
          )}
        </fieldset>
      )}

      {/* Términos */}
      <label className="flex items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={accept}
          onChange={(e) => setAccept(e.target.checked)}
          disabled={pending}
          className="mt-0.5 size-4 accent-emerald"
        />
        <span>
          Acepto los términos del evento, las políticas de cancelación y el
          tratamiento de mis datos para la gestión de la entrada.
        </span>
      </label>

      {error && (
        <p className="flex items-center gap-2 text-sm text-red-300">
          <AlertCircle className="size-4" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-premium flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-white disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="size-5 animate-spin" /> Procesando…
          </>
        ) : isFree ? (
          "Registrar entrada de cortesía"
        ) : (
          "Registrar solicitud"
        )}
      </button>
      <p className="text-center text-xs text-muted">
        {isFree
          ? "La organización validará tu cortesía y confirmará tu entrada."
          : "Tus entradas se confirman únicamente después de validar el pago por SINPE."}
      </p>
    </form>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className={tone ?? "text-foreground"}>{value}</span>
    </div>
  );
}

function Field({
  icon: Icon,
  name,
  label,
  type = "text",
  required,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-emerald-soft">*</span>}
      </span>
      <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 focus-within:border-emerald/50">
        <Icon className="size-4 text-muted" />
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
        />
      </span>
    </label>
  );
}
