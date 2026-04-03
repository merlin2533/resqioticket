"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

const COLUMNS = [
  { status: "OPEN",        label: "Offen",          color: "border-blue-400",   bg: "bg-blue-50" },
  { status: "IN_PROGRESS", label: "In Bearbeitung", color: "border-yellow-400", bg: "bg-yellow-50" },
  { status: "WAITING",     label: "Wartend",        color: "border-orange-400", bg: "bg-orange-50" },
  { status: "RESOLVED",    label: "Gelöst",         color: "border-green-400",  bg: "bg-green-50" },
  { status: "CLOSED",      label: "Geschlossen",    color: "border-gray-400",   bg: "bg-gray-50" },
];

const priorityDot: Record<string, string> = {
  LOW: "bg-gray-400", MEDIUM: "bg-blue-500", HIGH: "bg-orange-500", URGENT: "bg-red-500",
};

const typeLabel: Record<string, string> = {
  INCIDENT: "INC", SERVICE_REQUEST: "SR", CHANGE_REQUEST: "CR", PROBLEM: "PRB",
};

type Tag = { id: string; name: string; color: string };
type Ticket = {
  id: string; number: number; subject: string; status: string; priority: string;
  type: string; name: string; assignedTo: { id: string; name: string } | null;
  createdAt: Date; updatedAt: Date;
  tags: { tag: Tag }[];
};

interface Props {
  tickets: Ticket[];
  agents: { id: string; name: string }[];
}

export function KanbanClient({ tickets: initialTickets, agents }: Props) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [dragId, setDragId] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState("");
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const filtered = agentFilter
    ? tickets.filter(t => t.assignedTo?.id === agentFilter)
    : tickets;

  const handleDragStart = useCallback((id: string) => setDragId(id), []);

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverCol(status);
  }, []);

  const handleDragLeave = useCallback(() => setDragOverCol(null), []);

  const handleDrop = useCallback(async (newStatus: string) => {
    setDragOverCol(null);
    if (!dragId) return;
    const ticket = tickets.find(t => t.id === dragId);
    if (!ticket || ticket.status === newStatus) { setDragId(null); return; }

    // Optimistic update
    setTickets(prev => prev.map(t => t.id === dragId ? { ...t, status: newStatus } : t));
    setDragId(null);

    await fetch(`/api/tickets/${dragId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }, [dragId, tickets, router]);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 ml-8 md:ml-0">Kanban Board</h1>
        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">Alle Agenten</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {COLUMNS.map(col => {
            const colTickets = filtered.filter(t => t.status === col.status);
            const isOver = dragOverCol === col.status;
            return (
              <div key={col.status}
                className={`w-72 flex flex-col rounded-xl border-t-4 ${col.color} bg-white shadow-sm border border-gray-200 ${isOver ? "ring-2 ring-blue-400" : ""}`}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(col.status)}
              >
                <div className={`px-4 py-3 ${col.bg} rounded-t-lg border-b border-gray-200`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500 font-medium shadow-sm">{colTickets.length}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
                  {colTickets.map(t => (
                    <div key={t.id}
                      draggable
                      onDragStart={() => handleDragStart(t.id)}
                      onClick={() => window.location.href = `/admin/tickets/${t.id}`}
                      className={`bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${dragId === t.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">#{t.number}</span>
                        <span className={`w-2 h-2 rounded-full ${priorityDot[t.priority] ?? "bg-gray-400"}`} />
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{typeLabel[t.type] ?? t.type}</span>
                        {t.tags.slice(0, 2).map(tt => (
                          <span key={tt.tag.id} className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: tt.tag.color }}>{tt.tag.name}</span>
                        ))}
                      </div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{t.subject}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{t.name}</span>
                        {t.assignedTo ? (
                          <div className="flex items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">{t.assignedTo.name.charAt(0)}</div>
                            <span>{t.assignedTo.name}</span>
                          </div>
                        ) : <span className="text-gray-300">–</span>}
                      </div>
                    </div>
                  ))}
                  {colTickets.length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-8">Keine Tickets</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
