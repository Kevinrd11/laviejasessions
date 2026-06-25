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
} from "lucide-react";
import { confirmCheckoutAction } from "@/app/sessions/actions";
import { brand } from "@/config/brand";

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

export function SessionCheckoutForm({
  orderId,
  orderCode,
}: {
  orderId: string;
  orderCode: string;
}) {
  const [method, setMethod] = useState<Method>("sinpe");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        <legend className="mb-2 font-display text-lg font-semibold">
          Tus datos
        </legend>

        <Field icon={User} name="customerName" label="Nombre completo" required placeholder="Nombre y apellidos" />
        <Field icon={Mail} name="customerEmail" type="email" label="Correo electrónico" required placeholder="tucorreo@ejemplo.com" />
        <Field icon={Phone} name="customerPhone" label="WhatsApp" required placeholder="8888 8888" />
        <Field icon={IdCard} name="customerIdNumber" label="Cédula (opcional)" placeholder="1 2345 6789" />
      </fieldset>

      {/* Método de pago */}
      <fieldset className="space-y-3" disabled={pending}>
        <legend className="mb-2 font-display text-lg font-semibold">
          Método de pago
        </legend>
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
                  active && !disabled
                    ? "bg-emerald/20 text-emerald-soft"
                    : "bg-white/5 text-muted"
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
                Transfiere el total por SINPE Móvil al{" "}
                <strong className="text-emerald-soft">{brand.sinpeDisplay}</strong>{" "}
                ({brand.company}).
              </li>
              <li>
                <strong className="text-foreground">Importante:</strong> en la{" "}
                <strong className="text-foreground">descripción / detalle</strong>{" "}
                del comprobante escribe tu código de orden.
              </li>
              <li>Envíanos el comprobante por WhatsApp para validar tu pago.</li>
            </ol>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Código de tu orden
                </p>
                <p className="font-mono text-lg font-bold tracking-widest text-emerald-soft">
                  {orderCode}
                </p>
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
          <AlertCircle className="size-4" />
          {error}
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
        ) : (
          "Registrar solicitud"
        )}
      </button>
      <p className="text-center text-xs text-muted">
        Tus entradas se confirman únicamente después de validar el pago por SINPE.
      </p>
    </form>
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
