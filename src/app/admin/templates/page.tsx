export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { TemplatesClient } from "./TemplatesClient";

export default async function AdminTemplatesPage() {
  const templates = await prisma.ticketTemplate.findMany({ orderBy: { name: "asc" } });
  return <TemplatesClient templates={templates} />;
}
