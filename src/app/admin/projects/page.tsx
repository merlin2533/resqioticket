export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { ProjectsClient } from "./ProjectsClient";

export default async function AdminProjectsPage() {
  const [projects, customers] = await Promise.all([
    prisma.project.findMany({
      orderBy: { name: "asc" },
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { tickets: true } },
      },
    }),
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return <ProjectsClient projects={projects} customers={customers} />;
}
