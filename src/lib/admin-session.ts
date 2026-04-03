import { cookies } from "next/headers";
import { verifyAgentToken, verifyAdminToken, AgentTokenData } from "./agent-session";

export type AdminSession =
  | { type: "superadmin"; role: "SUPERADMIN"; username: string }
  | { type: "agent" } & AgentTokenData;

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();

  // Check agent session first (individual login)
  const agentToken = cookieStore.get("agent_session")?.value;
  if (agentToken) {
    const data = await verifyAgentToken(agentToken);
    if (data) return { type: "agent", ...data };
  }

  // Fall back to admin session (superadmin username/password login)
  const adminSession = cookieStore.get("admin_session")?.value;
  if (adminSession) {
    const data = await verifyAdminToken(adminSession);
    if (data) return { type: "superadmin", role: "SUPERADMIN", username: data.username };
  }

  return null;
}

/** Returns true if the session has full admin access (SUPERADMIN or ADMIN role) */
export function isFullAdmin(session: AdminSession | null): boolean {
  if (!session) return false;
  if (session.type === "superadmin") return true;
  return session.role === "ADMIN";
}

/** If session is AGENT role, returns their agentId for filtering; otherwise null */
export function getAgentFilter(session: AdminSession | null): string | null {
  if (!session) return null;
  if (session.type === "superadmin") return null;
  if (session.role === "AGENT") return session.agentId;
  return null;
}
