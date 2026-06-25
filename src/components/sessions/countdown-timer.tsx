"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";

/** Cuenta regresiva de la reserva. Al llegar a 0 refresca (la orden expira). */
export function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const r = target - Date.now();
      setRemaining(r);
      if (r <= 0) {
        clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, router]);

  const expired = remaining <= 0;
  const totalSec = Math.max(0, Math.floor(remaining / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const urgent = totalSec <= 60;

  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
        expired
          ? "border-danger/30 bg-danger/10 text-red-300"
          : urgent
            ? "border-warning/30 bg-warning/10 text-warning"
            : "border-emerald/20 bg-emerald/5 text-emerald-soft"
      }`}
    >
      <Timer className="size-4" />
      {expired ? (
        <span>La reserva expiró. Vuelve a iniciar la compra.</span>
      ) : (
        <span>
          Cupos reservados — tiempo restante{" "}
          <span className="font-bold tabular-nums">
            {mm}:{ss}
          </span>
        </span>
      )}
    </div>
  );
}
