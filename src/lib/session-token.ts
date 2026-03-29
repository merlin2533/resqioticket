// Edge-safe session token helpers (uses Web Crypto API, no Node.js-only modules)

function getSecret(): string {
  const secret = process.env.CUSTOMER_SESSION_SECRET ?? process.env.API_KEY;
  if (!secret) {
    console.warn(
      "[session-token] Neither CUSTOMER_SESSION_SECRET nor API_KEY is set. " +
      "Using insecure fallback — set CUSTOMER_SESSION_SECRET in production."
    );
    return "changeme";
  }
  return secret;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacVerify(data: string, sig: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  if (sig.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < sig.length; i++) {
    result |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(token: string): string {
  const padded = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  return atob(pad ? padded + "====".slice(pad) : padded);
}

export async function createSessionToken(customerId: string): Promise<string> {
  const ts = Date.now().toString();
  const data = `${customerId}.${ts}`;
  const sig = await hmacSign(data, getSecret());
  return toBase64Url(`${data}.${sig}`);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const decoded = fromBase64Url(token);
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;
    const sig = decoded.slice(lastDot + 1);
    const data = decoded.slice(0, lastDot);
    if (!(await hmacVerify(data, sig, getSecret()))) return null;
    const dotIdx = data.indexOf(".");
    if (dotIdx === -1) return null;
    const customerId = data.slice(0, dotIdx);
    const ts = parseInt(data.slice(dotIdx + 1));
    if (Date.now() - ts > 30 * 24 * 60 * 60 * 1000) return null;
    return customerId;
  } catch {
    return null;
  }
}
