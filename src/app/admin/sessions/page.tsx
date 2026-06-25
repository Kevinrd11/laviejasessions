import Link from "next/link";
import {
  Users,
  Ticket,
  CircleCheck,
  Clock3,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { OrdersTable } from "@/components/admin/orders-table";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/admin";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel · Admin" };

export default async function AdminSessionsPage() {
  const admin = await requireAdmin();
  const events = await getAdminDashboard();

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Panel de La Vieja Sessions
          </h1>
          <p className="mt-1 text-sm text-muted">
            Conectado como {admin.name} · Confirma pagos SINPE manualmente.
          </p>
        </div>
        <form action={logoutAction}>
          <button className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium text-muted transition hover:bg-white/5">
            <LogOut className="size-4" /> Salir
          </button>
        </form>
      </div>

      <div className="space-y-10">
        {events.map((ev) => (
          <section key={ev.id} className="rounded-3xl glass-strong p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold">{ev.title}</h2>
              <Link
                href={`/sessions/${ev.slug}`}
                target="_blank"
                className="flex items-center gap-1.5 text-sm text-emerald-soft hover:underline"
              >
                Ver página pública <ExternalLink className="size-3.5" />
              </Link>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Users} label="Capacidad (preventa)" value={ev.capacity} tone="text-foreground" />
              <Stat icon={CircleCheck} label="Pagadas" value={ev.paidQty} tone="text-emerald-soft" />
              <Stat icon={Ticket} label="Disponibles" value={ev.available} tone="text-gold-soft" />
              <Stat icon={Clock3} label="Órdenes por revisar" value={ev.pendingOrders} tone="text-warning" />
            </div>

            {/* Barra de progreso */}
            <div className="mt-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald to-emerald-soft"
                  style={{ width: `${ev.percentSold}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {ev.percentSold}% vendido (pagadas) · {ev.pendingQty} entrada(s) en
                solicitudes pendientes
              </p>
            </div>

            {/* Órdenes */}
            <div className="mt-8">
              <h3 className="mb-3 font-display text-lg font-semibold">Órdenes</h3>
              <OrdersTable orders={ev.orders} />
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl glass p-4">
      <Icon className={`size-5 ${tone}`} />
      <p className={`mt-2 font-display text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
