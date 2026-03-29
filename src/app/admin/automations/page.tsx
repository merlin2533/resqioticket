export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { AutomationsClient } from "./AutomationsClient";

export default async function AdminAutomationsPage() {
  const [rules, agents, tags] = await Promise.all([
    prisma.automationRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.agent.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <AutomationsClient rules={rules} agents={agents} tags={tags} />;
}
