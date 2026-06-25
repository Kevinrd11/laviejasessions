# La Vieja Sessions

Sistema de eventos, venta de entradas, pagos, generación de **QR únicos** y
validación de asistentes — submarca oficial de **La Vieja Adventures**
(Sucre, Ciudad Quesada, San Carlos, Costa Rica).

Construido con **Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma ·
PostgreSQL (Neon) · Auth.js**. Diseño premium oscuro inspirado en bosque, noche
y montaña (verde esmeralda, dorado cálido, glassmorphism).

---

## ✅ Estado actual (Fase 0 + 1 — MVP funcional)

- `/sessions` — landing con hero, próximos eventos, concepto, tipos de sesión y confianza.
- `/sessions/[slug]` — ficha premium del evento + selector de entradas.
- `/sessions/checkout` — checkout mobile-first con temporizador de reserva (10 min).
- `/sessions/success` — entradas con **QR**, descargar/imprimir y compartir por WhatsApp.
- **Pago simulado** (MVP), SINPE manual (`pending_review`) y stub de tarjeta/link.
- **Control anti-sobreventa** con reserva transaccional y expiración automática (cron).
- Botones de WhatsApp en todas las pantallas · branding compartido (header/footer).

> Verificado end-to-end: reserva → pago → emisión de QR únicos → anti-sobreventa
> → liberación de cupos al expirar.

### Pendiente (siguientes fases — ya con base preparada)
- Fase 2: panel admin (`/admin/sessions`), scanner QR (`/admin/sessions/scanner`),
  Auth.js login, métricas, CSV, aprobación de SINPE.
- Fase 3: pasarela real (webhook en `/api/webhooks/payment/[provider]`),
  correo (Resend), PDF de entradas.

---

## 🚀 Puesta en marcha

### 1. Variables de entorno
```bash
cp .env.example .env
```
Edita `.env` con tu `DATABASE_URL` de Neon (o Postgres local) y un `AUTH_SECRET`
(`openssl rand -base64 32`).

> **Importante:** configura tu número real de WhatsApp en `src/config/brand.ts`
> (`whatsappNumber`, formato internacional sin `+`, ej. `50688888888`).

### 2. Base de datos
```bash
npm run db:push     # crea las tablas
npm run db:seed     # admin inicial + 3 eventos de ejemplo
```

#### Postgres local rápido (Docker)
```bash
docker run -d --name lvs-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=laviejasessions -p 5433:5432 postgres:16-alpine
# DATABASE_URL="postgresql://postgres:postgres@localhost:5433/laviejasessions?sslmode=disable"
```

### 3. Desarrollo
```bash
npm run dev
# http://localhost:3000/sessions
```

---

## 🗂️ Arquitectura

```
src/
├─ app/
│  ├─ sessions/                # público: landing, evento, checkout, success
│  │  ├─ actions.ts            # server actions: createOrder, confirmCheckout
│  │  └─ [slug] · checkout · success
│  └─ api/cron/expire-orders   # libera cupos de órdenes vencidas (Vercel Cron)
├─ components/
│  ├─ brand/                   # header, footer, logo, WhatsApp (branding compartido)
│  ├─ sessions/                # hero, cards, selector, summary, QR, ticket...
│  └─ ui/                      # button, container, badge
├─ lib/
│  ├─ db.ts · sessions.ts · validations.ts · utils.ts
│  ├─ services/orders.ts       # reserva transaccional + anti-sobreventa + tickets
│  ├─ services/qr.ts           # token único + imagen QR
│  └─ payments/index.ts        # capa de pagos (simulado · sinpe · stub pasarela)
└─ config/                     # brand.ts (WhatsApp/contacto/Sucre) · orders.ts
prisma/schema.prisma           # 7 modelos + AdminAuditLog + enums
```

## 🔐 Flujo de la orden (anti-sobreventa)
`pending` (reserva 10 min, atómica) → `paid` | `failed` | `expired` |
`pending_review` (SINPE) | `cancelled`. Las entradas (`SessionTicket` con QR)
solo se generan cuando la orden queda **pagada o aprobada**.

## 💳 Pagos
`processPayment()` en `src/lib/payments/index.ts` es el único punto de entrada.
Cambiar a una pasarela real = reemplazar las ramas `card`/`link` y conectar el
webhook. **Nunca se guardan datos de tarjeta.**
