"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Agent = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  reminderEnabled: boolean;
  notifyOnNewTicket: boolean;
  notifyOnComment: boolean;
  notifyOnStatusChange: boolean;
  _count: { assignedTickets: number };
};

type EditForm = {
  name: string;
  role: string;
  isActive: boolean;
  reminderEnabled: boolean;
  notifyOnNewTicket: boolean;
  notifyOnComment: boolean;
  notifyOnStatusChange: boolean;
  password: string;
};

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

export function AgentsClient({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "AGENT" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Fehler"); return; }
    setShowForm(false); setForm({ name: "", email: "", role: "AGENT" });
    router.refresh();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  async function toggleReminder(id: string, enabled: boolean) {
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ reminderEnabled: !enabled }),
    });
    router.refresh();
  }

  function openEdit(a: Agent) {
    setEditAgent(a);
    setEditForm({
      name: a.name,
      role: a.role,
      isActive: a.isActive,
      reminderEnabled: a.reminderEnabled,
      notifyOnNewTicket: a.notifyOnNewTicket,
      notifyOnComment: a.notifyOnComment,
      notifyOnStatusChange: a.notifyOnStatusChange,
      password: "",
    });
    setEditError("");
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editAgent || !editForm) return;
    setEditSaving(true); setEditError("");
    const body: Record<string, unknown> = {
      name: editForm.name,
      role: editForm.role,
      isActive: editForm.isActive,
      reminderEnabled: editForm.reminderEnabled,
      notifyOnNewTicket: editForm.notifyOnNewTicket,
      notifyOnComment: editForm.notifyOnComment,
      notifyOnStatusChange: editForm.notifyOnStatusChange,
    };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/agents/${editAgent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify(body),
    });
    setEditSaving(false);
    if (!res.ok) { const d = await res.json(); setEditError(d.error ?? "Fehler"); return; }
    setEditAgent(null); setEditForm(null);
    router.refresh();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenten</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Agent anlegen
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Neuer Agent</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Max Mustermann" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-Mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="max@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rolle</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "..." : "Erstellen"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {editAgent && editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-900 mb-4">Agent bearbeiten: {editAgent.name}</h3>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rolle</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Passwort setzen (für Agent-Login)</label>
                <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Leer lassen = nicht ändern" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">E-Mail-Benachrichtigungen</p>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={editForm.notifyOnNewTicket} onChange={(e) => setEditForm({ ...editForm, notifyOnNewTicket: e.target.checked })} className="rounded" />
                  Benachrichtigung bei neuen Tickets
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={editForm.notifyOnComment} onChange={(e) => setEditForm({ ...editForm, notifyOnComment: e.target.checked })} className="rounded" />
                  Benachrichtigung bei neuen Kommentaren
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={editForm.notifyOnStatusChange} onChange={(e) => setEditForm({ ...editForm, notifyOnStatusChange: e.target.checked })} className="rounded" />
                  Benachrichtigung bei Statusänderungen
                </label>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="rounded" />
                  Aktiv
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={editForm.reminderEnabled} onChange={(e) => setEditForm({ ...editForm, reminderEnabled: e.target.checked })} className="rounded" />
                  Erinnerungen
                </label>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={editSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {editSaving ? "..." : "Speichern"}
                </button>
                <button type="button" onClick={() => { setEditAgent(null); setEditForm(null); }} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">E-Mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Rolle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-20">Tickets</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Erinnerung</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agents.map((a) => (
              <tr key={a.id} className={`${!a.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">{a.name.charAt(0)}</div>
                    {a.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{a.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>{a.role}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{a._count.assignedTickets}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleReminder(a.id, a.reminderEnabled)} className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer ${a.reminderEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {a.reminderEnabled ? "An" : "Aus"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(a.id, a.isActive)} className={`text-xs px-2 py-1 rounded-full font-medium ${a.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {a.isActive ? "Aktiv" : "Inaktiv"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(a)} className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
