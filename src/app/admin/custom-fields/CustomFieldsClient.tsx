"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Field = {
  id: string; name: string; label: string; type: string;
  options: string[] | null; required: boolean; isActive: boolean;
  sortOrder: number; _count: { values: number };
};

type Form = { name: string; label: string; type: string; options: string; required: boolean; sortOrder: number };

const TYPE_LABELS: Record<string, string> = {
  text: "Text", number: "Zahl", boolean: "Ja/Nein", select: "Auswahl"
};

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

const defaultForm: Form = { name: "", label: "", type: "text", options: "", required: false, sortOrder: 0 };

export function CustomFieldsClient({ fields: initial }: { fields: Field[] }) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Form>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  void fields;
  void setFields;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const body = {
      ...form,
      options: form.type === "select" ? form.options.split("\n").map(s => s.trim()).filter(Boolean) : undefined,
    };
    const res = await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setShowCreate(false);
      setForm(defaultForm);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Fehler");
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/custom-fields/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ isActive: !current }),
    });
    router.refresh();
  }

  async function handleDelete(id: string, valueCount: number) {
    if (!confirm(`Dieses Feld und ${valueCount} gespeicherte Werte löschen?`)) return;
    await fetch(`/api/custom-fields/${id}`, { method: "DELETE", headers: { "x-api-key": getApiKey() } });
    router.refresh();
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benutzerdefinierte Felder</h1>
          <p className="text-sm text-gray-500 mt-1">Eigene Felder für alle Tickets definieren</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Neues Feld
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Neues Feld erstellen</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Feldname (intern)</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                  placeholder="z.B. customer_id" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Anzeige-Label</label>
                <input value={form.label} onChange={e => setForm({...form, label: e.target.value})} required
                  placeholder="z.B. Kunden-ID" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="text">Text</option>
                  <option value="number">Zahl</option>
                  <option value="boolean">Ja/Nein</option>
                  <option value="select">Auswahl</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reihenfolge</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {form.type === "select" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Optionen (eine pro Zeile)</label>
                <textarea value={form.options} onChange={e => setForm({...form, options: e.target.value})} rows={3}
                  placeholder={"Option A\nOption B\nOption C"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.required} onChange={e => setForm({...form, required: e.target.checked})} className="rounded" />
              Pflichtfeld
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "..." : "Erstellen"}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setForm(defaultForm); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fields list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {initial.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">Noch keine Felder definiert.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Label</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Typ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-20">Werte</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Status</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {initial.map(f => (
                <tr key={f.id} className={`${!f.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{f.label}{f.required && <span className="ml-1 text-red-500">*</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.name}</td>
                  <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[f.type] ?? f.type}</td>
                  <td className="px-4 py-3 text-gray-400">{f._count.values}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(f.id, f.isActive)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${f.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {f.isActive ? "Aktiv" : "Inaktiv"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(f.id, f._count.values)} className="text-xs text-red-400 hover:text-red-600">Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
