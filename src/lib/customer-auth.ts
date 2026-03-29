import { scrypt, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const scryptAsync = promisify(scrypt);

function getSecret(): string {
  return process.env.CUSTOMER_SESSION_SECRET ?? process.env.API_KEY ?? "changeme";
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}:${salt}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [hash, salt] = stored.split(":");
  if (!hash || !salt) return false;
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), buf);
  } catch {
    return false;
  }
}

export function createSessionToken(customerId: string): string {
  const ts = Date.now().toString();
  const data = `${customerId}.${ts}`;
  const sig = createHmac("sha256", getSecret()).update(data).digest("hex");
  return Buffer.from(`${data}.${sig}`).toString("base64url");
}

export function verifySessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(".");
    if (parts.length < 3) return null;
    const sig = parts[parts.length - 1];
    const data = parts.slice(0, parts.length - 1).join(".");
    const expectedSig = createHmac("sha256", getSecret()).update(data).digest("hex");
    if (sig.length !== expectedSig.length) return null;
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) return null;
    const [customerId, ts] = data.split(".");
    // 30-day expiry
    if (Date.now() - parseInt(ts) > 30 * 24 * 60 * 60 * 1000) return null;
    return customerId;
  } catch {
    return null;
  }
}

export async function getCustomerFromRequest() {
  const cookieStore = await cookies();
  const token = cookieStore.get("customer_session")?.value;
  if (!token) return null;
  const customerId = verifySessionToken(token);
  if (!customerId) return null;
  return prisma.customer.findUnique({ where: { id: customerId, isActive: true } });
}
