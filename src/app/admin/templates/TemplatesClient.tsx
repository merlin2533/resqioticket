"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TiptapEditor } from "@/components/editor/TiptapEditor";

type Template = { id: string; name: string; subject: string; description: string; priority: string; isActive: boolean };

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

const priorityLabels: Record<string, string> = { LOW: "Niedrig", MEDIUM: "Mittel", HIGH: "Hoch", URGENT: "Dringend" };

export function TemplatesClient({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Template | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", description: "", priority: "MEDIUM", isActive: true });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
    const method = editing ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setEditing(null); setShowNew(false);
    setForm({ name: "", subject: "", description: "", priority: "MEDIUM", isActive: true });
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Vorlage wirklich löschen?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE", headers: { "x-api-key": getApiKey() } });
    router.refresh();
  }

  function startEdit(t: Template) {
    setForm({ name: t.name, subject: t.subject, description: t.description, priority: t.priority, isActive: t.isActive });
    setEditing(t);
    setShowNew(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ticket-Vorlagen</h1>
        <button onClick={() => { setShowNew(true); setEditing(null); setForm({ name: "", subject: "", description: "", priority: "MEDIUM", isActive: true }); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          + Neue Vorlage
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">{editing ? "Vorlage bearbeiten" : "Neue Vorlage"}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name der Vorlage</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="z.B. Passwort vergessen" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priorität</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                  {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Betreff</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Betreff der Vorlage" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung (Rich Text, Todo-Listen, Bilder)</label>
              <TiptapEditor
                content={form.description}
                onChange={(html) => setForm({ ...form, description: html })}
                placeholder="Vorlage-Inhalt mit Formatierung, Todo-Listen…"
                minHeight="200px"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                Aktiv
              </label>
              <button type="submit" disabled={saving} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Speichern…" : "Speichern"}
              </button>
              <button type="button" onClick={() => { setShowNew(false); setEditing(null); }} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {templates.length === 0 && <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">Noch keine Vorlagen erstellt</div>}
        {templates.map((t) => (
          <div key={t.id} className={`bg-white rounded-xl border shadow-sm p-4 ${!t.isActive ? "opacity-60 border-gray-200" : "border-gray-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{t.name}</span>
                  {!t.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inaktiv</span>}
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">{priorityLabels[t.priority]}</span>
                </div>
                <p className="text-sm text-gray-600 truncate">{t.subject}</p>
                <div className="text-xs text-gray-400 mt-1 line-clamp-1" dangerouslySetInnerHTML={{ __html: t.description.replace(/<[^>]+>/g, " ").slice(0, 120) + "…" }} />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(t)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Bearbeiten</button>
                <button onClick={() => handleDelete(t.id)} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Löschen</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
