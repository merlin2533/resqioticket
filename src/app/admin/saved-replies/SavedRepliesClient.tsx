"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

type Reply = {
  id: string; title: string; body: string; category: string | null;
  isGlobal: boolean; sortOrder: number; agent: { id: string; name: string } | null;
};

export function SavedRepliesClient({ replies }: { replies: Reply[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", category: "", isGlobal: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = Array.from(new Set(replies.map(r => r.category).filter((c): c is string => c !== null)));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const apiKey = getApiKey();
    const payload = { ...form, category: form.category || undefined };
    const url = editId ? `/api/saved-replies/${editId}` : "/api/saved-replies";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Fehler"); return; }
    setShowForm(false); setEditId(null);
    setForm({ title: "", body: "", category: "", isGlobal: true });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Textbaustein wirklich löschen?")) return;
    await fetch(`/api/saved-replies/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": getApiKey() },
    });
    router.refresh();
  }

  function startEdit(r: Reply) {
    setForm({ title: r.title, body: r.body, category: r.category ?? "", isGlobal: r.isGlobal });
    setEditId(r.id);
    setShowForm(true);
  }

  const grouped = categories.length > 0
    ? categories.map(cat => ({ category: cat, items: replies.filter(r => r.category === cat) }))
    : [{ category: null as string | null, items: replies }];
  const uncategorized = replies.filter(r => !r.category);
  if (categories.length > 0 && uncategorized.length > 0) {
    grouped.push({ category: "Sonstige", items: uncategorized });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 ml-8 md:ml-0">Textbausteine</h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: "", body: "", category: "", isGlobal: true }); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Neu
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">{editId ? "Bearbeiten" : "Neuer Textbaustein"}</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titel</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="z.B. Begrüßung" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kategorie</label>
                <input value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  list="categories"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
                <datalist id="categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Inhalt</label>
              <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} required rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-y" placeholder="Antworttext..." />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.isGlobal} onChange={e => setForm({...form, isGlobal: e.target.checked})} className="rounded" />
              Für alle Agenten sichtbar
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "..." : editId ? "Speichern" : "Erstellen"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setError(""); }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Abbrechen</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {(categories.length > 0 ? grouped : [{ category: null, items: replies }]).map((group, gi) => (
          <div key={gi}>
            {group.category && <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.category}</h2>}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {group.items.length === 0 && <p className="p-4 text-sm text-gray-400">Keine Textbausteine</p>}
              {group.items.map(r => (
                <div key={r.id} className="border-b border-gray-100 last:border-0 p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2 whitespace-pre-wrap">{r.body}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.isGlobal && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Global</span>}
                      <button onClick={() => startEdit(r)} className="text-xs text-blue-600 hover:underline">Bearbeiten</button>
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Löschen</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
