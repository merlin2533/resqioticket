export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export default async function AdminSettingsPage() {
  const settings = await prisma.settings.upsert({
    where:  { id: "default" },
    create: { id: "default" },
    update: {},
  });
  return <SettingsClient settings={settings} />;
}
