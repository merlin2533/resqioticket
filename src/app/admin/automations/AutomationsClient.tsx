"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Agent = { id: string; name: string };
type Tag = { id: string; name: string; color: string };
type Rule = { id: string; name: string; trigger: string; conditions: unknown; actions: unknown; isActive: boolean; runCount: number };

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

const FIELDS = ["subject","description","email","name","priority","status"];
const OPERATORS = ["contains","not_contains","equals","not_equals","starts_with","ends_with"];
const ACTION_TYPES = ["set_priority","set_status","assign_agent","add_tag","add_comment"];
const TRIGGERS = [
  { value: "ticket_created", label: "Ticket erstellt" },
  { value: "ticket_updated", label: "Ticket aktualisiert" },
  { value: "comment_added",  label: "Kommentar hinzugefügt" },
];
const PRIORITIES = ["LOW","MEDIUM","HIGH","URGENT"];
const STATUSES = ["OPEN","IN_PROGRESS","WAITING","RESOLVED","CLOSED"];

type Condition = { field: string; operator: string; value: string };
type Action = { type: string; value: string };

export function AutomationsClient({ rules, agents, tags }: { rules: Rule[]; agents: Agent[]; tags: Tag[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("ticket_created");
  const [logic, setLogic] = useState<"AND"|"OR">("AND");
  const [conditions, setConditions] = useState<Condition[]>([{ field: "subject", operator: "contains", value: "" }]);
  const [actions, setActions] = useState<Action[]>([{ type: "set_priority", value: "HIGH" }]);

  function addCondition() { setConditions([...conditions, { field: "subject", operator: "contains", value: "" }]); }
  function removeCondition(i: number) { setConditions(conditions.filter((_, idx) => idx !== i)); }
  function updateCondition(i: number, k: keyof Condition, v: string) { const c = [...conditions]; c[i] = { ...c[i], [k]: v }; setConditions(c); }
  function addAction() { setActions([...actions, { type: "set_priority", value: "HIGH" }]); }
  function removeAction(i: number) { setActions(actions.filter((_, idx) => idx !== i)); }
  function updateAction(i: number, k: keyof Action, v: string) { const a = [...actions]; a[i] = { ...a[i], [k]: v }; setActions(a); }

  function getValueOptions(type: string): string[] {
    if (type === "set_priority") return PRIORITIES;
    if (type === "set_status") return STATUSES;
    if (type === "assign_agent") return agents.map((a) => a.id);
    if (type === "add_tag") return tags.map((t) => t.name);
    return [];
  }

  function getValueLabel(type: string, value: string): string {
    if (type === "assign_agent") return agents.find((a) => a.id === value)?.name ?? value;
    return value;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ name, trigger, conditions: { items: conditions, logic }, actions }),
    });
    setSaving(false);
    setShowForm(false);
    router.refresh();
  }

  async function toggleActive(rule: Rule) {
    await fetch(`/api/automations/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Regel wirklich löschen?")) return;
    await fetch(`/api/automations/${id}`, { method: "DELETE", headers: { "x-api-key": getApiKey() } });
    router.refresh();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Automatisierungsregeln</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Neue Regel
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Neue Automatisierungsregel</h3>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="z.B. VIP-Kunden priorisieren" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Auslöser</label>
                <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Bedingungen</label>
                <select value={logic} onChange={(e) => setLogic(e.target.value as "AND"|"OR")} className="px-2 py-1 border border-gray-300 rounded text-xs bg-white">
                  <option value="AND">Alle müssen zutreffen (AND)</option>
                  <option value="OR">Mindestens eine (OR)</option>
                </select>
                <button type="button" onClick={addCondition} className="text-xs text-blue-600 hover:underline ml-auto">+ Bedingung</button>
              </div>
              <div className="space-y-2">
                {conditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <select value={c.field} onChange={(e) => updateCondition(i, "field", e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
                      {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={c.operator} onChange={(e) => updateCondition(i, "operator", e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
                      {OPERATORS.map((o) => <option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
                    </select>
                    <input value={c.value} onChange={(e) => updateCondition(i, "value", e.target.value)} placeholder="Wert" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500" />
                    {conditions.length > 1 && <button type="button" onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Aktionen</label>
                <button type="button" onClick={addAction} className="text-xs text-blue-600 hover:underline">+ Aktion</button>
              </div>
              <div className="space-y-2">
                {actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
                    <select value={a.type} onChange={(e) => updateAction(i, "type", e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
                      {ACTION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
                    </select>
                    {(a.type === "set_priority" || a.type === "set_status" || a.type === "assign_agent" || a.type === "add_tag") ? (
                      <select value={a.value} onChange={(e) => updateAction(i, "value", e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white">
                        {getValueOptions(a.type).map((v) => <option key={v} value={v}>{getValueLabel(a.type, v)}</option>)}
                      </select>
                    ) : (
                      <input value={a.value} onChange={(e) => updateAction(i, "value", e.target.value)} placeholder="Kommentartext" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    )}
                    {actions.length > 1 && <button type="button" onClick={() => removeAction(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Speichern…" : "Regel erstellen"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Abbrechen</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {rules.length === 0 && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Keine Automatisierungsregeln vorhanden</div>}
        {rules.map((r) => {
          const conds = (r.conditions as { items: Condition[]; logic: string });
          const acts = r.actions as Action[];
          return (
            <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-4 ${!r.isActive ? "opacity-60" : ""} border-gray-200`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{r.name}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{TRIGGERS.find((t) => t.value === r.trigger)?.label}</span>
                    {!r.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inaktiv</span>}
                    <span className="text-xs text-gray-400 ml-auto">Ausgeführt: {r.runCount}×</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Wenn</strong> ({conds.logic}): {conds.items?.map((c, i) => <span key={i} className="bg-gray-100 px-1.5 py-0.5 rounded mr-1">{c.field} {c.operator.replace(/_/g," ")} &ldquo;{c.value}&rdquo;</span>)}</p>
                    <p><strong>Dann</strong>: {acts.map((a, i) => <span key={i} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-1">{a.type.replace(/_/g," ")} → {a.value}</span>)}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => toggleActive(r)} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${r.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {r.isActive ? "Aktiv" : "Aktivieren"}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Löschen</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
