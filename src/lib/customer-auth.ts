import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/session-token";

export { createSessionToken, verifySessionToken } from "@/lib/session-token";

const scryptAsync = promisify(scrypt);

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

export async function getCustomerFromRequest() {
  const cookieStore = await cookies();
  const token = cookieStore.get("customer_session")?.value;
  if (!token) return null;
  const customerId = await verifySessionToken(token);
  if (!customerId) return null;
  return prisma.customer.findUnique({ where: { id: customerId, isActive: true } });
}
