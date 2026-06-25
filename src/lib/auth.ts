import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const COOKIE_NAME = "lvs_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no está configurado.");
  return s;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Genera un token de sesión firmado (HMAC-SHA256) con vencimiento. */
function createSessionToken(userId: string) {
  const body = b64url(
    JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  );
  return `${body}.${sign(body)}`;
}

/** Verifica el token (firma + vencimiento) y devuelve el userId o null. */
function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  // Comparación en tiempo constante.
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!uid || typeof exp !== "number" || Date.now() > exp) return null;
    return uid as string;
  } catch {
    return null;
  }
}

/** Valida credenciales contra AdminUser (bcrypt). Devuelve el usuario o null. */
export async function loginWithCredentials(email: string, password: string) {
  const user = await db.adminUser.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

/** Crea la cookie de sesión para un usuario admin. */
export async function startSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Elimina la cookie de sesión. */
export async function endSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Devuelve el admin autenticado (o null) leyendo la cookie. */
export async function getAdminSession() {
  const store = await cookies();
  const uid = verifySessionToken(store.get(COOKIE_NAME)?.value);
  if (!uid) return null;
  const user = await db.adminUser.findUnique({ where: { id: uid } });
  return user ?? null;
}

/** Exige sesión admin; redirige a /admin/login si no hay. */
export async function requireAdmin() {
  const user = await getAdminSession();
  if (!user) redirect("/admin/login");
  return user;
}
