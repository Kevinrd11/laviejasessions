"use client";

import { useState, useTransition } from "react";
import { Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { loginAction } from "@/app/admin/actions";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    startTransition(async () => {
      const res = await loginAction({ email, password });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo href="/sessions" />
        </div>
        <div className="rounded-3xl glass-strong p-8">
          <h1 className="font-display text-2xl font-bold">Panel administrativo</h1>
          <p className="mt-1 text-sm text-muted">
            Acceso exclusivo para el equipo de La Vieja Sessions.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Correo</span>
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 focus-within:border-emerald/50">
                <Mail className="size-4 text-muted" />
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@laviejaadventures.com"
                  className="h-11 w-full bg-transparent text-sm outline-none"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Contraseña</span>
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 focus-within:border-emerald/50">
                <Lock className="size-4 text-muted" />
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 w-full bg-transparent text-sm outline-none"
                />
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
              className="btn-premium flex h-11 w-full items-center justify-center gap-2 rounded-full font-semibold text-white disabled:opacity-50"
            >
              {pending ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> Ingresando…
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
