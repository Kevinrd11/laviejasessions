import { PrismaClient } from "../src/generated/prisma/index.js";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("🌱 Sembrando datos de La Vieja Sessions...");

  // --- Admin inicial ---
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@laviejaadventures.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "laVieja2026!";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrador La Vieja";

  await db.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      role: "owner",
    },
  });
  console.log(`👤 Admin listo: ${email}`);

  // Limpieza idempotente de eventos demo (borra órdenes dependientes primero).
  const demoSlugs = ["sunset-session-la-vieja", "night-session-bosque-vivo", "coffee-nature-session"];
  const demoEvents = await db.sessionEvent.findMany({
    where: { slug: { in: demoSlugs } },
    select: { id: true },
  });
  const demoEventIds = demoEvents.map((e) => e.id);
  if (demoEventIds.length > 0) {
    // Las entradas/items/pagos caen en cascada al borrar la orden.
    await db.sessionOrder.deleteMany({ where: { eventId: { in: demoEventIds } } });
    await db.sessionEvent.deleteMany({ where: { id: { in: demoEventIds } } });
  }

  // --- 1. Sunset Session en La Vieja ---
  // Fecha del evento "por definirse": se usa un placeholder y la entrada del
  // día se desbloquea automáticamente al llegar esta fecha.
  const sunsetDate = daysFromNow(21);
  await db.sessionEvent.create({
    data: {
      title: "Sunset Session en La Vieja",
      slug: "sunset-session-la-vieja",
      subtitle: "Atardecer entre montaña, música suave y café local",
      description:
        "Una tarde especial entre montaña, música suave, café local y ambiente natural. Vení a despedir el día desde uno de los mejores miradores de Sucre, con una experiencia curada por La Vieja Adventures: sonido en vivo, gastronomía local y la energía del bosque al atardecer.",
      imageUrl:
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1600&auto=format&fit=crop",
      date: sunsetDate,
      startTime: "16:00",
      endTime: "20:00",
      location: "Mirador La Vieja, Sucre, Ciudad Quesada",
      googleMapsUrl: "https://maps.google.com/?q=La+Vieja+Adventures+Sucre",
      wazeUrl: "https://waze.com/ul?q=La%20Vieja%20Adventures%20Sucre",
      minAge: null,
      status: "published",
      featured: true,
      includes: [
        "Acceso al mirador y zona de evento",
        "Música en vivo / DJ set acústico",
        "Café local de bienvenida",
        "Parqueo disponible",
      ],
      bring: ["Abrigo ligero", "Cámara o celular", "Ganas de desconectar"],
      policies: [
        "Cupos limitados, entrada solo con QR válido",
        "Evento se realiza con lluvia ligera (zona techada parcial)",
        "Prohibido el ingreso de bebidas externas",
      ],
      ticketTypes: {
        create: [
          {
            name: "Preventa",
            description: "Cupo limitado a 35 entradas. Precio especial por tiempo limitado.",
            price: 8000,
            quantityTotal: 35,
            maxPerOrder: 6,
            unlimited: false,
            status: "active",
          },
          {
            name: "Entrada Día del Evento",
            description: "Disponible únicamente el día del evento, sujeto a disponibilidad en puerta.",
            price: 12000,
            quantityTotal: 0,
            maxPerOrder: 8,
            unlimited: true,
            // Se habilita al llegar el día del evento (por definirse).
            salesStart: sunsetDate,
            status: "active",
          },
        ],
      },
    },
  });

  // --- 2. Night Session Bosque Vivo ---
  await db.sessionEvent.create({
    data: {
      title: "Night Session Bosque Vivo",
      slug: "night-session-bosque-vivo",
      subtitle: "Experiencia nocturna guiada entre luces cálidas",
      description:
        "Evento nocturno especial con ambiente natural, luces cálidas, bebidas sin alcohol y experiencia guiada. Una sesión íntima para vivir el bosque de noche con todos los sentidos: sonidos, aromas y la magia de Sucre bajo las estrellas.",
      imageUrl:
        "https://images.unsplash.com/photo-1517824806704-9040b037703b?q=80&w=1600&auto=format&fit=crop",
      date: daysFromNow(35),
      startTime: "18:30",
      endTime: "22:00",
      location: "Sendero Bosque Vivo, La Vieja Adventures, Sucre",
      googleMapsUrl: "https://maps.google.com/?q=La+Vieja+Adventures+Sucre",
      wazeUrl: "https://waze.com/ul?q=La%20Vieja%20Adventures%20Sucre",
      minAge: 16,
      status: "published",
      featured: false,
      includes: [
        "Caminata nocturna guiada",
        "Bebidas sin alcohol",
        "Luces y ambientación natural",
        "Baños y parqueo disponibles",
      ],
      bring: ["Zapato cerrado cómodo", "Abrigo", "Repelente"],
      policies: [
        "Edad mínima 16 años",
        "Llegar 20 minutos antes del inicio",
        "Entrada solo con QR válido",
      ],
      ticketTypes: {
        create: [
          {
            name: "General",
            description: "Acceso individual a la experiencia nocturna.",
            price: 12000,
            quantityTotal: 50,
            maxPerOrder: 6,
            status: "active",
          },
          {
            name: "Pareja",
            description: "Entrada para dos personas con precio especial.",
            price: 22000,
            quantityTotal: 25,
            maxPerOrder: 3,
            status: "active",
          },
        ],
      },
    },
  });

  // --- 3. Coffee & Nature Session ---
  await db.sessionEvent.create({
    data: {
      title: "Coffee & Nature Session",
      slug: "coffee-nature-session",
      subtitle: "Café local, naturaleza y música acústica",
      description:
        "Experiencia relajada con café local, naturaleza y música acústica. Una mañana para conectar con calma, conocer el proceso del café de la zona y disfrutar de buena música rodeado de bosque.",
      imageUrl:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop",
      date: daysFromNow(14),
      startTime: "08:00",
      endTime: "11:00",
      location: "Finca Café La Vieja, Sucre, Ciudad Quesada",
      googleMapsUrl: "https://maps.google.com/?q=La+Vieja+Adventures+Sucre",
      wazeUrl: "https://waze.com/ul?q=La%20Vieja%20Adventures%20Sucre",
      minAge: null,
      status: "published",
      featured: false,
      includes: [
        "Degustación de café local",
        "Recorrido por la finca",
        "Música acústica en vivo",
        "Snack natural",
      ],
      bring: ["Sombrero o gorra", "Protector solar", "Cámara"],
      policies: ["Cupos limitados", "Apto para toda la familia", "Entrada solo con QR válido"],
      ticketTypes: {
        create: [
          {
            name: "General",
            description: "Acceso completo a la experiencia.",
            price: 7500,
            quantityTotal: 30,
            maxPerOrder: 8,
            status: "active",
          },
        ],
      },
    },
  });

  console.log("✅ Listo: 3 eventos de ejemplo creados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
