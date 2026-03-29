export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const pageSize = 50;

  const where = sp.action ? { action: { contains: sp.action, mode: "insensitive" as const } } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        ticket: { select: { number: true, subject: true } },
        agent:  { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit-Log <span className="text-gray-400 font-normal text-lg">({total})</span></h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-36">Zeitpunkt</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-40">Aktion</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">Entity</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Ticket</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">Agent</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("de-DE")}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{log.entityType}</td>
                <td className="px-4 py-3">
                  {log.ticket ? (
                    <a href={`/admin/tickets/${log.ticketId}`} className="text-sm text-blue-600 hover:underline">
                      #{log.ticket.number} {log.ticket.subject.slice(0, 40)}
                    </a>
                  ) : <span className="text-gray-300">–</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.agent?.name ?? <span className="text-gray-300">–</span>}</td>
                <td className="px-4 py-3">
                  {log.newValue ? (
                    <span className="text-xs text-gray-400 font-mono">
                      {JSON.stringify(log.newValue).slice(0, 80)}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">Keine Einträge vorhanden</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">Seite {page} von {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && <a href={`/admin/audit?page=${page - 1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">← Zurück</a>}
              {page < totalPages && <a href={`/admin/audit?page=${page + 1}`} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Weiter →</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
