"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EmailTemplate = {
  id: string; type: string; name: string;
  subject: string; htmlBody: string; variables: string; isActive: boolean;
};

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

const TYPE_LABELS: Record<string, string> = {
  ticket_created: "Ticket erstellt",
  new_comment:    "Neuer Kommentar (an Kunden)",
  status_changed: "Status geändert",
  agent_notify:   "Agent-Benachrichtigung (neue Aktivität)",
  central_notify: "Zentrale Benachrichtigung",
  reminder:       "Erinnerung",
};

function VariableBadge({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(`{{${name.trim()}}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <button onClick={copy} title="Klicken zum Kopieren"
      className="font-mono text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors">
      {copied ? "✓" : `{{${name.trim()}}}`}
    </button>
  );
}

export function EmailTemplatesClient({ templates }: { templates: EmailTemplate[] }) {
  const router = useRouter();
  const [editing, setEditing]     = useState<EmailTemplate | null>(null);
  const [subject, setSubject]     = useState("");
  const [htmlBody, setHtmlBody]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [preview, setPreview]     = useState(false);

  function startEdit(t: EmailTemplate) {
    setEditing(t);
    setSubject(t.subject);
    setHtmlBody(t.htmlBody);
    setPreview(false);
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/email-templates/${editing.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ subject, htmlBody }),
    });
    setSaving(false);
    setEditing(null);
    router.refresh();
  }

  async function toggleActive(t: EmailTemplate) {
    await fetch(`/api/email-templates/${t.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    router.refresh();
  }

  const variables = editing?.variables.split(",").map((v) => v.trim()).filter(Boolean) ?? [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">E-Mail-Vorlagen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Passen Sie alle ausgehenden E-Mails an. Variablen wie <code className="bg-gray-100 px-1 rounded">{"{{ticketNumber}}"}</code> werden automatisch ersetzt.
        </p>
      </div>

      {/* Template list */}
      {!editing && (
        <div className="space-y-3">
          {templates.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">Noch keine Vorlagen vorhanden.</p>
              <a href="/admin/settings" className="text-blue-600 hover:underline text-sm">Standard-Vorlagen anlegen →</a>
            </div>
          )}
          {templates.map((t) => (
            <div key={t.id} className={`bg-white rounded-xl border shadow-sm p-5 ${!t.isActive ? "opacity-60" : ""} border-gray-200`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{t.name}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{TYPE_LABELS[t.type] ?? t.type}</span>
                    {!t.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inaktiv</span>}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    <span className="font-medium text-gray-700">Betreff:</span> {t.subject}
                  </p>
                  {t.variables && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.variables.split(",").map((v) => v.trim()).filter(Boolean).map((v) => (
                        <span key={v} className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{`{{${v}}}`}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => toggleActive(t)} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${t.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {t.isActive ? "Aktiv" : "Inaktiv"}
                  </button>
                  <button onClick={() => startEdit(t)} className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">
                    Bearbeiten
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h2 className="font-semibold text-gray-900">{editing.name}</h2>
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">{TYPE_LABELS[editing.type] ?? editing.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPreview(!preview)} className={`px-3 py-1.5 text-sm rounded-lg border ${preview ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                {preview ? "◀ Editor" : "Vorschau ▶"}
              </button>
              <button onClick={cancelEdit} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                Abbrechen
              </button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Variables */}
            {variables.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Verfügbare Variablen <span className="font-normal text-gray-400">(klicken zum Kopieren)</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {variables.map((v) => <VariableBadge key={v} name={v} />)}
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betreff</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* HTML Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HTML-Inhalt</label>
              {preview ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2 text-xs text-gray-500 border-b border-gray-200">Vorschau (Variablen werden als Platzhalter angezeigt)</div>
                  <iframe srcDoc={htmlBody} sandbox="allow-scripts allow-same-origin" className="w-full h-64 border-0" title="Template preview" />
                </div>
              ) : (
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 bg-gray-950 text-green-400"
                  spellCheck={false}
                />
              )}
              <p className="text-xs text-gray-400 mt-1">
                Tipp: Verwenden Sie <code className="bg-gray-100 px-1 rounded">{"{{variable}}"}</code> für dynamische Inhalte.
                HTML-Tags wie <code className="bg-gray-100 px-1 rounded">{"<strong>"}</code>, <code className="bg-gray-100 px-1 rounded">{"<a href>"}</code> etc. sind erlaubt.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
