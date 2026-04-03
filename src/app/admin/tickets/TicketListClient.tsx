"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

function getApiKey() {
  if (typeof document !== "undefined") {
    return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  }
  return "";
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  OPEN:        { label: "Offen",          cls: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Bearbeitung", cls: "bg-yellow-100 text-yellow-700" },
  WAITING:     { label: "Wartend",        cls: "bg-orange-100 text-orange-700" },
  RESOLVED:    { label: "Geloest",        cls: "bg-green-100 text-green-700" },
  CLOSED:      { label: "Geschlossen",    cls: "bg-gray-100 text-gray-600" },
};

const priorityConfig: Record<string, { label: string; cls: string }> = {
  LOW:    { label: "Niedrig", cls: "text-gray-400" },
  MEDIUM: { label: "Mittel",  cls: "text-blue-500" },
  HIGH:   { label: "Hoch",    cls: "text-orange-500" },
  URGENT: { label: "Dringend",cls: "text-red-500 font-bold" },
};

type Tag = { id: string; name: string; color: string };
type Agent = { id: string; name: string };
type Project = { id: string; name: string; color: string };
type Ticket = {
  id: string; number: number; subject: string; status: string; priority: string;
  email: string; name: string; createdAt: Date; assignedTo: Agent | null;
  tags: { tag: Tag }[];
  _count: { comments: number; attachments: number };
  slaBreached: boolean;
  slaDeadline: Date | null;
  project: Project | null;
};

interface Props {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  tags: Tag[];
  agents: Agent[];
  projects: Project[];
  filters: { status?: string; priority?: string; q?: string; tag?: string; project?: string };
}

export function TicketListClient({ tickets, total, page, pageSize, tags, projects, filters }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const totalPages = Math.ceil(total / pageSize);

  const allSelected = tickets.length > 0 && tickets.every((t) => selectedIds.has(t.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map((t) => t.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function applyBulkAction(action: string, value?: string) {
    if (action === "delete" && !confirm(`${selectedIds.size} Tickets wirklich löschen?`)) return;
    const res = await fetch("/api/tickets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ ids: Array.from(selectedIds), action, value }),
    });
    if (res.ok) {
      setSelectedIds(new Set());
      router.refresh();
    }
  }

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { ...filters, q: q || undefined, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return `/admin/tickets?${sp.toString()}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ page: "1" }));
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    const apiKey = getApiKey();
    // Can't set headers on navigation, so use a fetch + blob download approach
    fetch(`/api/tickets/export?${params.toString()}`, { headers: { "x-api-key": apiKey } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tickets-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 ml-8 md:ml-0">Tickets <span className="text-gray-400 font-normal text-base md:text-lg">({total})</span></h1>
        <Link href="/admin/tickets/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0">+ Ticket</Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen…"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Suchen</button>
        </form>

        {/* Status filter */}
        <select
          value={filters.status ?? ""}
          onChange={(e) => router.push(buildUrl({ status: e.target.value || undefined, page: "1" }))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Priority filter */}
        <select
          value={filters.priority ?? ""}
          onChange={(e) => router.push(buildUrl({ priority: e.target.value || undefined, page: "1" }))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Prioritäten</option>
          {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Tag filter */}
        <select
          value={filters.tag ?? ""}
          onChange={(e) => router.push(buildUrl({ tag: e.target.value || undefined, page: "1" }))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Tags</option>
          {tags.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>

        {/* Project filter */}
        <select
          value={filters.project ?? ""}
          onChange={(e) => router.push(buildUrl({ project: e.target.value || undefined, page: "1" }))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Projekte</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <button
          onClick={handleExport}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          ↓ CSV
        </button>

        {(filters.status || filters.priority || filters.q || filters.tag || filters.project) && (
          <button onClick={() => router.push("/admin/tickets")} className="text-sm text-gray-500 hover:text-red-500">✕ Reset</button>
        )}
      </div>

      {/* Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-14">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Betreff</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-20">Prio</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">Zugewiesen</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-28">Projekt</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-36">Erstellt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tickets.map((t) => {
              const sc = statusConfig[t.status] ?? statusConfig.OPEN;
              const pc = priorityConfig[t.priority] ?? priorityConfig.MEDIUM;
              return (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return; router.push(`/admin/tickets/${t.id}`); }}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-400">{t.number}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate max-w-xs">{t.subject}</span>
                      {t.slaBreached && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium shrink-0" title={t.slaDeadline ? `SLA überschritten seit ${new Date(t.slaDeadline).toLocaleString("de-DE")}` : "SLA überschritten"}>
                          SLA
                        </span>
                      )}
                      {t.tags.slice(0, 3).map((tt) => (
                        <span key={tt.tag.id} className="text-xs px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: tt.tag.color }}>
                          {tt.tag.name}
                        </span>
                      ))}
                      {t._count.attachments > 0 && <span className="text-xs text-gray-400">📎{t._count.attachments}</span>}
                      {t._count.comments > 0 && <span className="text-xs text-gray-400">💬{t._count.comments}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.name} · {t.email}</div>
                  </td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.cls}`}>{sc.label}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium ${pc.cls}`}>● {pc.label}</span></td>
                  <td className="px-4 py-3 text-gray-500">{t.assignedTo?.name ?? <span className="text-gray-300">–</span>}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.project ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.project.color }} />
                        {t.project.name}
                      </span>
                    ) : <span className="text-gray-300">–</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{new Date(t.createdAt).toLocaleDateString("de-DE")}</td>
                </tr>
              );
            })}
            {tickets.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">Keine Tickets gefunden</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {tickets.map((t) => {
          const sc = statusConfig[t.status] ?? statusConfig.OPEN;
          const pc = priorityConfig[t.priority] ?? priorityConfig.MEDIUM;
          return (
            <div key={t.id} onClick={() => router.push(`/admin/tickets/${t.id}`)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-pointer active:bg-gray-50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-400">#{t.number}</span>
                <span className={`text-xs font-medium ${pc.cls}`}>● {pc.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls} ml-auto`}>{sc.label}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{t.subject}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {t.tags.slice(0, 2).map((tt) => (
                  <span key={tt.tag.id} className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: tt.tag.color }}>{tt.tag.name}</span>
                ))}
                {t._count.attachments > 0 && <span className="text-xs text-gray-400">📎{t._count.attachments}</span>}
                {t._count.comments > 0 && <span className="text-xs text-gray-400">💬{t._count.comments}</span>}
                {t.slaBreached && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">SLA</span>}
              </div>
              {t.project && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.project.color }} />
                  <span className="text-xs text-gray-500">{t.project.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{t.name}</span>
                <span>{t.assignedTo?.name ?? "–"} · {new Date(t.createdAt).toLocaleDateString("de-DE")}</span>
              </div>
            </div>
          );
        })}
        {tickets.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Keine Tickets gefunden</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">Seite {page} von {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">← Zurück</Link>}
            {page < totalPages && <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">Weiter →</Link>}
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-2 md:gap-3 z-40 max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium">{selectedIds.size} ausgewählt</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-white">× Abwählen</button>
          <div className="h-4 w-px bg-gray-600" />
          <select onChange={e => { if (e.target.value) applyBulkAction("set_status", e.target.value); e.target.value = ""; }}
            className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 cursor-pointer">
            <option value="">Status setzen…</option>
            <option value="OPEN">Offen</option>
            <option value="IN_PROGRESS">In Bearbeitung</option>
            <option value="WAITING">Wartend</option>
            <option value="RESOLVED">Gelöst</option>
            <option value="CLOSED">Geschlossen</option>
          </select>
          <select onChange={e => { if (e.target.value) applyBulkAction("set_priority", e.target.value); e.target.value = ""; }}
            className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 cursor-pointer">
            <option value="">Priorität…</option>
            <option value="LOW">Niedrig</option>
            <option value="MEDIUM">Mittel</option>
            <option value="HIGH">Hoch</option>
            <option value="URGENT">Dringend</option>
          </select>
          <button onClick={() => applyBulkAction("delete")}
            className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded font-medium">
            🗑 Löschen
          </button>
        </div>
      )}
    </div>
  );
}
