import { cookies } from "next/headers";
import { verifyAgentToken, AgentTokenData } from "./agent-session";

export type AdminSession =
  | { type: "api_key"; role: "SUPERADMIN" }
  | { type: "agent" } & AgentTokenData;

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();

  // Check agent session first (individual login)
  const agentToken = cookieStore.get("agent_session")?.value;
  if (agentToken) {
    const data = await verifyAgentToken(agentToken);
    if (data) return { type: "agent", ...data };
  }

  // Fall back to API key session (global admin)
  const adminSession = cookieStore.get("admin_session")?.value;
  if (adminSession && process.env.API_KEY && adminSession === process.env.API_KEY) {
    return { type: "api_key", role: "SUPERADMIN" };
  }

  return null;
}

/** Returns true if the session has full admin access (SUPERADMIN or ADMIN role) */
export function isFullAdmin(session: AdminSession | null): boolean {
  if (!session) return false;
  if (session.type === "api_key") return true;
  return session.role === "ADMIN";
}

/** If session is AGENT role, returns their agentId for filtering; otherwise null */
export function getAgentFilter(session: AdminSession | null): string | null {
  if (!session) return null;
  if (session.type === "api_key") return null;
  if (session.role === "AGENT") return session.agentId;
  return null;
}
