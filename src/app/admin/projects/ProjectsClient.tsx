"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  isActive: boolean;
  _count: { tickets: number };
};
type Customer = { id: string; name: string; email: string };

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

const defaultForm = { name: "", description: "", color: "#6366f1", customerId: "" };

export function ProjectsClient({
  projects,
  customers,
}: {
  projects: Project[];
  customers: Customer[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        color: form.color,
        customerId: form.customerId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Fehler beim Erstellen");
      return;
    }
    setShowForm(false);
    setForm(defaultForm);
    router.refresh();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  function startEdit(p: Project) {
    setEditForm({
      name: p.name,
      description: p.description ?? "",
      color: p.color,
      customerId: p.customerId ?? "",
    });
    setEditProject(p);
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProject) return;
    setEditSaving(true);
    setEditError("");
    const res = await fetch(`/api/projects/${editProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description || null,
        color: editForm.color,
        customerId: editForm.customerId || null,
      }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setEditError(d.error ?? "Fehler beim Speichern");
      return;
    }
    setEditProject(null);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Projekt "${name}" wirklich löschen?`)) return;
    await fetch(`/api/projects/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": getApiKey() },
    });
    router.refresh();
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 ml-8 md:ml-0">Projekte</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); setForm(defaultForm); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Projekt anlegen
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Neues Projekt</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Website Relaunch"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kunde</label>
                <select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Kein Kunde</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Kurze Beschreibung (optional)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Farbe</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-md border border-gray-300 shrink-0"
                    style={{ backgroundColor: form.color }}
                  />
                  <input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="#6366f1"
                    pattern="^#[0-9a-fA-F]{6}$"
                  />
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "..." : "Erstellen"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(""); }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit modal */}
      {editProject && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Projekt bearbeiten</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kunde</label>
                  <select
                    value={editForm.customerId}
                    onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Kein Kunde</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Kurze Beschreibung (optional)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Farbe</label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-md border border-gray-300 shrink-0"
                      style={{ backgroundColor: editForm.color }}
                    />
                    <input
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="#6366f1"
                      pattern="^#[0-9a-fA-F]{6}$"
                    />
                  </div>
                </div>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {editSaving ? "..." : "Speichern"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditProject(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects list */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-sm text-gray-400">
          Noch keine Projekte angelegt
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3 ${!p.isActive ? "opacity-60" : ""}`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-semibold text-gray-900 truncate">{p.name}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{p._count.tickets} Ticket{p._count.tickets !== 1 ? "s" : ""}</span>
              </div>

              {/* Description */}
              {p.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{p.description}</p>
              )}

              {/* Customer */}
              {p.customer && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {p.customer.name}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <button
                  onClick={() => toggleActive(p.id, p.isActive)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    p.isActive
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {p.isActive ? "Aktiv" : "Inaktiv"}
                </button>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => startEdit(p)}
                    className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="text-xs px-2.5 py-1 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
