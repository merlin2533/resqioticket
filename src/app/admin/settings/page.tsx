export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-session";
import { SettingsClient } from "./SettingsClient";

export default async function AdminSettingsPage() {
  const [settings, session] = await Promise.all([
    prisma.settings.upsert({
      where:  { id: "default" },
      create: { id: "default" },
      update: {},
    }),
    getAdminSession(),
  ]);

  const agentId = session?.type === "agent" ? session.agentId : null;

  return <SettingsClient settings={settings} agentId={agentId} />;
}
