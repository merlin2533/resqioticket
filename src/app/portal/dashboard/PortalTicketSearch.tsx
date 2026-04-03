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
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen", IN_PROGRESS: "In Bearbeitung", WAITING: "Wartend",
  RESOLVED: "Gelöst", CLOSED: "Geschlossen",
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  WAITING: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

export function PortalTicketSearch({ tickets }: { tickets: Ticket[] }) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? tickets.filter(t =>
        t.subject.toLowerCase().includes(q.toLowerCase()) ||
        String(t.number).includes(q)
      )
    : tickets;

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Tickets durchsuchen…"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">{q ? `Keine Tickets für „${q}"` : "Noch keine Tickets vorhanden."}</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-16">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Betreff</th>
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
                <p className="text-xs text-gray-400 mt-1">{new Date(t.createdAt).toLocaleDateString("de-DE")}</p>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
