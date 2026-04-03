export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { SavedRepliesClient } from "./SavedRepliesClient";

export default async function SavedRepliesPage() {
  const replies = await prisma.savedReply.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    include: { agent: { select: { id: true, name: true } } },
  });
  return <SavedRepliesClient replies={replies} />;
}
