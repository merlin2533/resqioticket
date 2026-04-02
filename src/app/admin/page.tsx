export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

type RecentTicket = {
  id: string; number: number; subject: string;
  status: string; priority: string;
  assignedTo: { name: string } | null;
  tags: { tagId: string; tag: { name: string; color: string } }[];
};

type Stats = {
  open: number; inProgress: number; waiting: number; resolved: number;
  total: number; urgent: number; unassigned: number;
  recentTickets: RecentTicket[];
};

async function getStats(agentId?: string): Promise<Stats | { error: string }> {
  try {
  const agentFilter = agentId ? { assignedToId: agentId } : {};
  const [open, inProgress, waiting, resolved, total, urgent, unassigned, recentTickets] =
    await Promise.all([
      prisma.ticket.count({ where: { ...agentFilter, status: "OPEN" } }),
      prisma.ticket.count({ where: { ...agentFilter, status: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { ...agentFilter, status: "WAITING" } }),
      prisma.ticket.count({ where: { ...agentFilter, status: "RESOLVED" } }),
      prisma.ticket.count({ where: agentFilter }),
      prisma.ticket.count({ where: { ...agentFilter, priority: "URGENT", status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      agentId
        ? Promise.resolve(0)
        : prisma.ticket.count({ where: { assignedToId: null, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.ticket.findMany({
        where: agentFilter,
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { assignedTo: { select: { name: true } }, tags: { include: { tag: true } } },
      }),
    ]);
  return { open, inProgress, waiting, resolved, total, urgent, unassigned, recentTickets };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2021") return { error: "Datenbank nicht initialisiert. Bitte Migrationen ausführen." };
    return { error: "Datenbankfehler: " + String(e) };
  }
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  OPEN:        { label: "Offen",          cls: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Bearbeitung", cls: "bg-yellow-100 text-yellow-700" },
  WAITING:     { label: "Wartend",        cls: "bg-orange-100 text-orange-700" },
  RESOLVED:    { label: "Geloest",        cls: "bg-green-100 text-green-700" },
  CLOSED:      { label: "Geschlossen",    cls: "bg-gray-100 text-gray-600" },
};

const priorityConfig: Record<string, string> = {
  LOW: "text-gray-400", MEDIUM: "text-blue-500", HIGH: "text-orange-500", URGENT: "text-red-500",
};

export default async function AdminDashboard() {
  const hdrs = await headers();
  const agentId = hdrs.get("x-agent-id");
  const agentRole = hdrs.get("x-agent-role");
  const filterAgentId = agentId && agentRole === "AGENT" ? agentId : undefined;
  const stats = await getStats(filterAgentId);

  if ("error" in stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-red-800 mb-2">Datenbankfehler</h2>
          <p className="text-sm text-red-700">{stats.error}</p>
          <p className="text-xs text-red-500 mt-3">Bitte stelle sicher, dass die Datenbank erreichbar ist und führe <code className="bg-red-100 px-1 rounded">npx prisma migrate deploy</code> aus.</p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Offen",          value: stats.open,       color: "bg-blue-500" },
    { label: "In Bearbeitung", value: stats.inProgress, color: "bg-yellow-500" },
    { label: "Wartend",        value: stats.waiting,    color: "bg-orange-500" },
    { label: "Geloest",        value: stats.resolved,   color: "bg-green-500" },
    { label: "Gesamt",         value: stats.total,      color: "bg-gray-500" },
    { label: "Dringend",       value: stats.urgent,     color: "bg-red-500" },
    { label: "Nicht zugewiesen", value: stats.unassigned, color: "bg-purple-500" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className={`w-8 h-1 rounded-full ${c.color} mb-3`} />
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Letzte Tickets</h2>
          <a href="/admin/tickets" className="text-sm text-blue-600 hover:underline">Alle ansehen →</a>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.recentTickets.map((t) => {
            const sc = statusConfig[t.status] ?? statusConfig.OPEN;
            return (
              <a
                key={t.id}
                href={`/admin/tickets/${t.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-mono text-gray-400 w-12 shrink-0">#{t.number}</span>
                <span className={`text-xs font-medium ${priorityConfig[t.priority]} shrink-0`}>●</span>
                <span className="flex-1 text-sm font-medium text-gray-900 truncate">{t.subject}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {t.tags.slice(0, 2).map((tt) => (
                    <span key={tt.tagId} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: tt.tag.color }}>
                      {tt.tag.name}
                    </span>
                  ))}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                  <span className="text-xs text-gray-400">{t.assignedTo?.name ?? "–"}</span>
                </div>
              </a>
            );
          })}
          {stats.recentTickets.length === 0 && (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Keine Tickets vorhanden</p>
          )}
        </div>
      </div>
    </div>
  );
}
