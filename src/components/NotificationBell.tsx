"use client";

import { useEffect, useState, useRef } from "react";

type TicketEvent = {
  id: string;
  type: "ticket_created" | "ticket_updated" | "comment_added";
  ticketNumber: number;
  subject: string;
  message: string;
  timestamp: string;
};

const EVENT_LABELS: Record<string, string> = {
  ticket_created: "Neues Ticket",
  ticket_updated: "Ticket aktualisiert",
  comment_added: "Neue Antwort",
};

const EVENT_ICONS: Record<string, string> = {
  ticket_created: "🎫",
  ticket_updated: "🔄",
  comment_added: "💬",
};

export function NotificationBell({ apiKey }: { apiKey: string }) {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "connected") return;
        setEvents(prev => [data, ...prev].slice(0, 30)); // keep last 30
        setUnread(prev => prev + 1);
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      // Browser will auto-reconnect for SSE
    };

    return () => es.close();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    setOpen(o => !o);
    if (!open) setUnread(0);
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        title="Benachrichtigungen"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Benachrichtigungen</span>
            {events.length > 0 && (
              <button onClick={() => setEvents([])} className="text-xs text-gray-400 hover:text-gray-600">
                Alle löschen
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {events.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Keine Benachrichtigungen</p>
            ) : (
              events.map(ev => (
                <a
                  key={ev.id}
                  href={`/admin/tickets`}
                  className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg shrink-0">{EVENT_ICONS[ev.type] ?? "📩"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500">{EVENT_LABELS[ev.type] ?? ev.type}</p>
                    <p className="text-sm text-gray-900 truncate">#{ev.ticketNumber} {ev.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ev.message}</p>
                  </div>
                  <span className="text-xs text-gray-300 shrink-0">{formatTime(ev.timestamp)}</span>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
