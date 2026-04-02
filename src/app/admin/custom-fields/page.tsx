export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { CustomFieldsClient } from "./CustomFieldsClient";

export default async function AdminCustomFieldsPage() {
  const rawFields = await prisma.customField.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { values: true } } },
  });
  const fields = rawFields.map((f) => ({
    ...f,
    options: Array.isArray(f.options) ? (f.options as string[]) : null,
  }));
  return <CustomFieldsClient fields={fields} />;
}
