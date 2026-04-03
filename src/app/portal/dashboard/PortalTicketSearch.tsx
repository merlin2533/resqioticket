"use client";
import { useState } from "react";
import Link from "next/link";

type Ticket = {
  number: number;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date | string;
  externalToken: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
};

type Project = { id: string; name: string };

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen", IN_PROGRESS: "In Bearbeitung", WAITING: "Wartend",
  RESOLVED: "Gelöst", CLOSED: "Geschlossen", ARCHIVED: "Archiviert",
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  WAITING: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
  ARCHIVED: "bg-purple-100 text-purple-700",
};

export function PortalTicketSearch({ tickets, projects = [] }: { tickets: Ticket[]; projects?: Project[] }) {
  const [q, setQ] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const filtered = tickets.filter(t => {
    if (projectFilter && t.projectId !== projectFilter) return false;
    if (q.trim()) {
      return t.subject.toLowerCase().includes(q.toLowerCase()) || String(t.number).includes(q);
    }
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Tickets durchsuchen…"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {projects.length > 0 && (
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Projekte</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">{q || projectFilter ? "Keine Tickets gefunden" : "Noch keine Tickets vorhanden."}</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-16">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Betreff</th>
                  {projects.length > 0 && <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">Projekt</th>}
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-36">Erstellt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t => (
                  <tr key={t.externalToken} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">#{t.number}</td>
                    <td className="px-4 py-3">
                      <Link href={`/portal/tickets/${t.externalToken}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {t.subject}
                      </Link>
                    </td>
                    {projects.length > 0 && (
                      <td className="px-4 py-3 text-gray-500 text-xs">{t.project?.name ?? "–"}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map(t => (
              <a key={t.externalToken} href={`/portal/tickets/${t.externalToken}`} className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">#{t.number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"} ml-auto`}>{STATUS_LABELS[t.status] ?? t.status}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{t.subject}</p>
                <div className="flex items-center justify-between mt-1">
                  {t.project && <span className="text-xs text-blue-600">{t.project.name}</span>}
                  <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString("de-DE")}</span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
