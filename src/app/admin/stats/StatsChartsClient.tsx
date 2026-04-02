"use client";

type StatusData = { open: number; inProgress: number; waiting: number; resolved: number; closed: number };
type PriorityData = { low: number; medium: number; high: number; urgent: number };
type AgentStat = { id: string; name: string; totalTickets: number; activeTickets: number };
type DayData = { date: string; created: number };

interface Props {
  statusData: StatusData;
  priorityData: PriorityData;
  agentStats: AgentStat[];
  timeline: DayData[];
}

function HorizontalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className={`h-4 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

function LineChart({ data }: { data: DayData[] }) {
  if (data.length === 0) return <p className="text-xs text-gray-400 text-center py-8">Keine Daten</p>;
  const maxVal = Math.max(...data.map(d => d.created), 1);
  const W = 600; const H = 120; const PAD = 20;
  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.created / maxVal) * (H - PAD * 2));
    return { x, y, ...d };
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${H - PAD} L ${points[0].x} ${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGrad)" />
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" />
      {points.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((p, i) => (
        <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">
          {p.date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

export function StatsChartsClient({ statusData, priorityData, agentStats, timeline }: Props) {
  const maxStatus = Math.max(statusData.open, statusData.inProgress, statusData.waiting, statusData.resolved, statusData.closed);
  const maxPriority = Math.max(priorityData.low, priorityData.medium, priorityData.high, priorityData.urgent);
  const maxAgent = Math.max(...agentStats.map(a => a.totalTickets), 1);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Statistiken</h1>

      {/* Timeline */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Tickets erstellt (letzte 30 Tage)</h2>
        <LineChart data={timeline} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Nach Status</h2>
          <div className="space-y-3">
            <HorizontalBar label="Offen" value={statusData.open} max={maxStatus} color="bg-blue-500" />
            <HorizontalBar label="In Bearbeitung" value={statusData.inProgress} max={maxStatus} color="bg-yellow-500" />
            <HorizontalBar label="Wartend" value={statusData.waiting} max={maxStatus} color="bg-orange-500" />
            <HorizontalBar label="Gelöst" value={statusData.resolved} max={maxStatus} color="bg-green-500" />
            <HorizontalBar label="Geschlossen" value={statusData.closed} max={maxStatus} color="bg-gray-400" />
          </div>
        </section>

        {/* Priority */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Nach Priorität</h2>
          <div className="space-y-3">
            <HorizontalBar label="Niedrig" value={priorityData.low} max={maxPriority} color="bg-gray-400" />
            <HorizontalBar label="Mittel" value={priorityData.medium} max={maxPriority} color="bg-blue-500" />
            <HorizontalBar label="Hoch" value={priorityData.high} max={maxPriority} color="bg-orange-500" />
            <HorizontalBar label="Dringend" value={priorityData.urgent} max={maxPriority} color="bg-red-500" />
          </div>
        </section>
      </div>

      {/* Agent workload */}
      {agentStats.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Agenten-Auslastung</h2>
          <div className="space-y-3">
            {agentStats.map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                  {a.name.charAt(0)}
                </div>
                <span className="text-xs text-gray-700 w-28 shrink-0 truncate">{a.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                  <div className="h-4 rounded-full bg-blue-200" style={{ width: `${Math.round((a.totalTickets / maxAgent) * 100)}%` }} />
                  <div className="h-4 rounded-full bg-blue-500 absolute top-0 left-0" style={{ width: `${Math.round((a.activeTickets / maxAgent) * 100)}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right shrink-0">{a.activeTickets} aktiv / {a.totalTickets}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Dunkel = aktive Tickets, Hell = gesamt</p>
        </section>
      )}
    </div>
  );
}
