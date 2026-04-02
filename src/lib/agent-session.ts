// Edge-safe agent session token helpers (uses Web Crypto API)

function getSecret(): string {
  const secret = process.env.AGENT_SESSION_SECRET ?? process.env.API_KEY;
  if (!secret) {
    console.error(
      "SECURITY ERROR: [agent-session] Neither AGENT_SESSION_SECRET nor API_KEY is set. " +
      "Using insecure fallback 'changeme' — THIS IS UNSAFE IN PRODUCTION. " +
      "Set AGENT_SESSION_SECRET immediately."
    );
    return "changeme";
  }
  return secret;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacVerify(data: string, sig: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  if (sig.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < sig.length; i++) result |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
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

export interface AgentTokenData {
  agentId: string;
  role: "ADMIN" | "AGENT";
  name: string;
  email: string;
}

export async function createAgentToken(data: AgentTokenData): Promise<string> {
  const ts = Date.now().toString();
  // Encode payload as base64url JSON + timestamp
  const payload = toBase64Url(JSON.stringify(data));
  const toSign = `${payload}.${ts}`;
  const sig = await hmacSign(toSign, getSecret());
  return toBase64Url(`${toSign}.${sig}`);
}

export async function verifyAgentToken(token: string): Promise<AgentTokenData | null> {
  try {
    const decoded = fromBase64Url(token);
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;
    const sig = decoded.slice(lastDot + 1);
    const toSign = decoded.slice(0, lastDot);
    if (!(await hmacVerify(toSign, sig, getSecret()))) return null;
    // toSign = payload.timestamp
    const secondDot = toSign.lastIndexOf(".");
    if (secondDot === -1) return null;
    const ts = parseInt(toSign.slice(secondDot + 1));
    // 7 day expiry
    if (Date.now() - ts > 7 * 24 * 60 * 60 * 1000) return null;
    const payloadB64 = toSign.slice(0, secondDot);
    return JSON.parse(fromBase64Url(payloadB64)) as AgentTokenData;
  } catch {
    return null;
  }
}
