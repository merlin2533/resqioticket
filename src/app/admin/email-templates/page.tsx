export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { EmailTemplatesClient } from "./EmailTemplatesClient";

export default async function AdminEmailTemplatesPage() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
  return <EmailTemplatesClient templates={templates} />;
}
