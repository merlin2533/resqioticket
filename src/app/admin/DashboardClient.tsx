"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen", IN_PROGRESS: "In Bearbeitung", WAITING: "Wartend",
  RESOLVED: "Gelöst", CLOSED: "Geschlossen", ARCHIVED: "Archiviert",
};
const TYPE_LABELS: Record<string, string> = {
  INCIDENT: "Incidents", SERVICE_REQUEST: "Service Requests",
  CHANGE_REQUEST: "Change Requests", PROBLEM: "Problems",
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-blue-600", IN_PROGRESS: "text-yellow-600", WAITING: "text-orange-600",
  RESOLVED: "text-green-600", CLOSED: "text-gray-500", ARCHIVED: "text-purple-500",
};
const TYPE_COLORS: Record<string, string> = {
  INCIDENT: "bg-red-100 text-red-700", SERVICE_REQUEST: "bg-blue-100 text-blue-700",
  CHANGE_REQUEST: "bg-purple-100 text-purple-700", PROBLEM: "bg-orange-100 text-orange-700",
};
const PRIO_COLORS: Record<string, string> = {
  LOW: "text-gray-400", MEDIUM: "text-blue-500", HIGH: "text-orange-500", URGENT: "text-red-500",
};

type Stats = {
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  todayCreated: number;
  todayResolved: number;
  avgResponseMinutes: number;
  fcrRate: number;
  slaCompliance: number;
  recentTickets: { id: string; number: number; subject: string; status: string; priority: string; type: string; updatedAt: string; assignedTo: { name: string } | null }[];
  agentPerformance: { agentId: string; name: string; ticketCount: number }[];
};

export function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats/dashboard", { headers: { "x-api-key": getApiKey() } })
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div></div>;
  if (!stats) return <div className="p-6 text-gray-500">Fehler beim Laden</div>;

  const totalOpen = (stats.statusCounts.OPEN ?? 0) + (stats.statusCounts.IN_PROGRESS ?? 0) + (stats.statusCounts.WAITING ?? 0);

  function formatTime(minutes: number) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 ml-8 md:ml-0">Dashboard</h1>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Offene Tickets</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalOpen}</p>
          <p className="text-xs text-gray-400 mt-1">Heute neu: {stats.todayCreated}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Antwortzeit</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{formatTime(stats.avgResponseMinutes)}</p>
          <p className="text-xs text-gray-400 mt-1">Letzte 30 Tage</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">FCR Rate</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.fcrRate}%</p>
          <p className="text-xs text-gray-400 mt-1">First Contact Resolution</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">SLA Compliance</p>
          <p className={`text-3xl font-bold mt-1 ${stats.slaCompliance >= 90 ? "text-green-600" : stats.slaCompliance >= 70 ? "text-orange-500" : "text-red-600"}`}>{stats.slaCompliance}%</p>
          <p className="text-xs text-gray-400 mt-1">Letzte 30 Tage</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Nach Status</h3>
          <div className="space-y-2">
            {Object.entries(STATUS_LABELS).filter(([k]) => k !== "ARCHIVED").map(([k, label]) => {
              const count = stats.statusCounts[k] ?? 0;
              return (
                <div key={k} className="flex items-center justify-between">
                  <span className={`text-sm ${STATUS_COLORS[k]}`}>{label}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Type Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Nach Typ</h3>
          <div className="space-y-2">
            {Object.entries(TYPE_LABELS).map(([k, label]) => {
              const count = stats.typeCounts[k] ?? 0;
              return (
                <div key={k} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[k]}`}>{label}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent Performance */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Agenten (30 Tage)</h3>
          <div className="space-y-2">
            {stats.agentPerformance.sort((a, b) => b.ticketCount - a.ticketCount).slice(0, 8).map(a => (
              <div key={a.agentId} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">{a.name.charAt(0)}</div>
                <span className="text-sm text-gray-700 flex-1 truncate">{a.name}</span>
                <span className="text-sm font-semibold text-gray-900">{a.ticketCount}</span>
              </div>
            ))}
            {stats.agentPerformance.length === 0 && <p className="text-xs text-gray-400">Keine Daten</p>}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Letzte Aktivität</h3>
        <div className="space-y-2">
          {stats.recentTickets.map(t => (
            <Link key={t.id} href={`/admin/tickets/${t.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-xs font-mono text-gray-400 w-10">#{t.number}</span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${PRIO_COLORS[t.priority] ? PRIO_COLORS[t.priority].replace("text-", "bg-") : "bg-gray-400"}`} />
              <span className="text-sm text-gray-900 flex-1 truncate">{t.subject}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[t.type] ?? "bg-gray-100 text-gray-600"}`}>{t.type === "SERVICE_REQUEST" ? "SR" : t.type === "CHANGE_REQUEST" ? "CR" : t.type === "PROBLEM" ? "PRB" : "INC"}</span>
              <span className="text-xs text-gray-400 shrink-0">{t.assignedTo?.name ?? "–"}</span>
              <span className="text-xs text-gray-400 shrink-0">{new Date(t.updatedAt).toLocaleDateString("de-DE")}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
