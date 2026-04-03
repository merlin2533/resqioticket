"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date | string;
  _count: { customers: number; tickets: number };
};

type CustomerOption = {
  id: string;
  name: string;
  email: string;
};

type ProjectCustomer = CustomerOption;

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

export function ProjectsClient({
  projects,
  allCustomers,
}: {
  projects: Project[];
  allCustomers: CustomerOption[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Edit modal state
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", isActive: true });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Customer management state
  const [customerProject, setCustomerProject] = useState<Project | null>(null);
  const [projectCustomers, setProjectCustomers] = useState<ProjectCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [addCustomerId, setAddCustomerId] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ name: form.name, description: form.description || undefined }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Fehler"); return; }
    setShowForm(false); setForm({ name: "", description: "" });
    router.refresh();
  }

  function openEdit(p: Project) {
    setEditProject(p);
    setEditForm({ name: p.name, description: p.description ?? "", isActive: p.isActive });
    setEditError("");
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editProject) return;
    setEditSaving(true); setEditError("");
    const res = await fetch(`/api/projects/${editProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description || null,
        isActive: editForm.isActive,
      }),
    });
    setEditSaving(false);
    if (!res.ok) { const d = await res.json(); setEditError(d.error ?? "Fehler"); return; }
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

  async function openCustomers(p: Project) {
    setCustomerProject(p);
    setCustomerError("");
    setAddCustomerId("");
    setLoadingCustomers(true);
    try {
      const res = await fetch(`/api/projects/${p.id}/customers`, {
        headers: { "x-api-key": getApiKey() },
      });
      const data = await res.json();
      setProjectCustomers(data.data ?? []);
    } catch {
      setCustomerError("Fehler beim Laden der Kunden");
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function handleAddCustomer() {
    if (!customerProject || !addCustomerId) return;
    setAddingCustomer(true); setCustomerError("");
    const res = await fetch(`/api/projects/${customerProject.id}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ customerId: addCustomerId }),
    });
    setAddingCustomer(false);
    if (!res.ok) { const d = await res.json(); setCustomerError(d.error ?? "Fehler"); return; }
    setAddCustomerId("");
    // Reload customers
    const listRes = await fetch(`/api/projects/${customerProject.id}/customers`, {
      headers: { "x-api-key": getApiKey() },
    });
    const listData = await listRes.json();
    setProjectCustomers(listData.data ?? []);
    router.refresh();
  }

  async function handleRemoveCustomer(customerId: string) {
    if (!customerProject) return;
    setCustomerError("");
    await fetch(`/api/projects/${customerProject.id}/customers?customerId=${customerId}`, {
      method: "DELETE",
      headers: { "x-api-key": getApiKey() },
    });
    setProjectCustomers((prev) => prev.filter((c) => c.id !== customerId));
    router.refresh();
  }

  const assignedIds = new Set(projectCustomers.map((c) => c.id));
  const unassignedCustomers = allCustomers.filter((c) => !assignedIds.has(c.id));

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 ml-8 md:ml-0">Projekte</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Projekt anlegen
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Neues Projekt</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Projektname"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Optionale Beschreibung"
                />
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

      {/* Edit Modal */}
      {editProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-900 mb-4">Projekt bearbeiten: {editProject.name}</h3>
            <form onSubmit={handleEditSave} className="space-y-4">
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Optionale Beschreibung"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  Aktiv
                </label>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-2 pt-1">
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

      {/* Customer Assignment Modal */}
      {customerProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Kunden: {customerProject.name}</h3>
              <button
                onClick={() => { setCustomerProject(null); setProjectCustomers([]); }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Add customer */}
            <div className="flex gap-2 mb-4">
              <select
                value={addCustomerId}
                onChange={(e) => setAddCustomerId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kunden auswählen...</option>
                {unassignedCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddCustomer}
                disabled={!addCustomerId || addingCustomer}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {addingCustomer ? "..." : "Hinzufügen"}
              </button>
            </div>

            {customerError && <p className="text-sm text-red-600 mb-3">{customerError}</p>}

            {/* Customer list */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {loadingCustomers ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">Laden...</div>
              ) : projectCustomers.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">
                  Noch keine Kunden zugewiesen
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {projectCustomers.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCustomer(c.id)}
                        className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        Entfernen
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Projects table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Beschreibung</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Kunden</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-20">Tickets</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-40">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Noch keine Projekte angelegt
                  </td>
                </tr>
              )}
              {projects.map((p) => (
                <tr key={p.id} className={!p.isActive ? "opacity-50" : ""}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                        {p.name.charAt(0)}
                      </div>
                      {p.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {p.description ?? <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p._count.customers}</td>
                  <td className="px-4 py-3 text-gray-500">{p._count.tickets}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      }`}
                    >
                      {p.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => openCustomers(p)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        Kunden
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="text-xs px-2 py-1 border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
