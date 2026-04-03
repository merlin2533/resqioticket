"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { sanitizeContent } from "@/lib/sanitize";

const statusOptions = [
  { value: "OPEN",        label: "Offen",          cls: "bg-blue-100 text-blue-700" },
  { value: "IN_PROGRESS", label: "In Bearbeitung", cls: "bg-yellow-100 text-yellow-700" },
  { value: "WAITING",     label: "Wartend",        cls: "bg-orange-100 text-orange-700" },
  { value: "RESOLVED",    label: "Geloest",        cls: "bg-green-100 text-green-700" },
  { value: "CLOSED",      label: "Geschlossen",    cls: "bg-gray-100 text-gray-600" },
];

const priorityOptions = [
  { value: "LOW",    label: "Niedrig", cls: "text-gray-500" },
  { value: "MEDIUM", label: "Mittel",  cls: "text-blue-500" },
  { value: "HIGH",   label: "Hoch",    cls: "text-orange-500" },
  { value: "URGENT", label: "Dringend",cls: "text-red-600" },
];

type Tag = { id: string; name: string; color: string };
type Agent = { id: string; name: string; email: string };
type Attachment = { id: string; filename: string; mimeType: string; size: number; driveUrl: string; createdAt: Date };
type AuditLog = { id: string; action: string; oldValue: unknown; newValue: unknown; createdAt: Date };
type Comment = { id: string; authorType: string; authorName: string; authorEmail: string; body: string; isInternal: boolean; createdAt: Date; author: Agent | null };
type Relation = { id: string; relationType: string; related?: { id: string; number: number; subject: string; status: string }; ticket?: { id: string; number: number; subject: string; status: string } };

type Ticket = {
  id: string; number: number; subject: string; description: string;
  status: string; priority: string; email: string; name: string;
  externalToken: string; assignedToId: string | null; assignedTo: Agent | null;
  createdAt: Date; updatedAt: Date; resolvedAt: Date | null;
  comments: Comment[];
  tags: { tag: Tag }[];
  attachments: Attachment[];
  sourceRelations: Relation[];
  targetRelations: Relation[];
  auditLogs: AuditLog[];
};

interface Props {
  ticket: Ticket;
  allTags: Tag[];
  agents: Agent[];
}

const API_KEY = typeof window !== "undefined" ? document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "" : "";

function getApiKey() {
  if (typeof document !== "undefined") {
    return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  }
  return "";
}

type CustomField = {
  id: string; name: string; label: string; type: string;
  options: string[] | null; required: boolean; isActive: boolean; sortOrder: number;
};

export function TicketDetailClient({ ticket, allTags, agents }: Props) {
  const router = useRouter();
  const [status, setStatus]     = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignedToId, setAssigned] = useState(ticket.assignedToId ?? "");
  const [saving, setSaving]     = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentInternal, setCommentInternal] = useState(false);
  const [notifyCreator, setNotifyCreator] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "attachments" | "relations" | "audit">("comments");
  const [linkTicketNum, setLinkTicketNum] = useState("");
  const [linkType, setLinkType] = useState("linked");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [savingCustomField, setSavingCustomField] = useState<string | null>(null);
  const [watchers, setWatchers] = useState<{ id: string; agentId: string; agent: { id: string; name: string; email: string } }[]>([]);
  void API_KEY;

  useEffect(() => {
    const apiKey = getApiKey();
    Promise.all([
      fetch("/api/custom-fields", { headers: { "x-api-key": apiKey } }).then(r => r.json()),
      fetch(`/api/tickets/${ticket.id}/custom-fields`, { headers: { "x-api-key": apiKey } }).then(r => r.json()),
    ]).then(([fieldsRes, valuesRes]) => {
      const activeFields: CustomField[] = (fieldsRes.data ?? []).filter((f: CustomField) => f.isActive);
      setCustomFields(activeFields);
      const valMap: Record<string, string> = {};
      for (const v of (valuesRes.data ?? [])) {
        valMap[v.fieldId] = v.value;
      }
      setCustomValues(valMap);
    }).catch(() => {});
    fetch(`/api/tickets/${ticket.id}/watchers`, { headers: { "x-api-key": apiKey } }).then(r => r.json()).then(res => setWatchers(res.data ?? [])).catch(() => {});
  }, [ticket.id]);

  async function handleCustomFieldChange(fieldId: string, value: string) {
    setCustomValues(prev => ({ ...prev, [fieldId]: value }));
    setSavingCustomField(fieldId);
    const apiKey = getApiKey();
    await fetch(`/api/tickets/${ticket.id}/custom-fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ fieldId, value }),
    });
    setSavingCustomField(null);
  }

  async function handleAddWatcher(agentId: string) {
    if (!agentId) return;
    const apiKey = getApiKey();
    const res = await fetch(`/api/tickets/${ticket.id}/watchers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ agentId }),
    });
    if (res.ok) {
      const data = await res.json();
      setWatchers(prev => [...prev, data.data]);
    }
  }

  async function handleRemoveWatcher(agentId: string) {
    const apiKey = getApiKey();
    await fetch(`/api/tickets/${ticket.id}/watchers?agentId=${agentId}`, {
      method: "DELETE",
      headers: { "x-api-key": apiKey },
    });
    setWatchers(prev => prev.filter(w => w.agentId !== agentId));
  }

  async function patchTicket(data: object) {
    setSaving(true);
    const apiKey = getApiKey();
    await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(data),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleStatusChange(v: string) {
    setStatus(v);
    await patchTicket({ status: v });
  }

  async function handlePriorityChange(v: string) {
    setPriority(v);
    await patchTicket({ priority: v });
  }

  async function handleAssignChange(v: string) {
    setAssigned(v);
    await patchTicket({ assignedToId: v || null });
  }

  async function handleAddTag(tagId: string) {
    const apiKey = getApiKey();
    await fetch(`/api/tickets/${ticket.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ tagId }),
    });
    router.refresh();
  }

  async function handleRemoveTag(tagId: string) {
    const apiKey = getApiKey();
    await fetch(`/api/tickets/${ticket.id}/tags?tagId=${tagId}`, {
      method: "DELETE",
      headers: { "x-api-key": apiKey },
    });
    router.refresh();
  }

  async function handleSendComment() {
    if (!commentBody.trim()) return;
    setSendingComment(true);
    const apiKey = getApiKey();
    await fetch(`/api/tickets/${ticket.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        body: commentBody,
        authorType: "AGENT",
        authorName: "Admin",
        authorEmail: "admin@resqio.ticket",
        isInternal: commentInternal,
        notifyCreator: commentInternal ? false : notifyCreator,
      }),
    });
    setCommentBody("");
    setSendingComment(false);
    router.refresh();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const apiKey = getApiKey();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("ticketId", ticket.id);
    await fetch("/api/attachments/upload", { method: "POST", headers: { "x-api-key": apiKey }, body: fd });
    router.refresh();
    e.target.value = "";
  }

  async function handleLinkTicket() {
    if (!linkTicketNum) return;
    const apiKey = getApiKey();
    // Find ticket by number
    const res = await fetch(`/api/tickets?search=${linkTicketNum}`, { headers: { "x-api-key": apiKey } });
    const data = await res.json();
    const found = data.data?.[0];
    if (!found) { alert("Ticket nicht gefunden"); return; }
    await fetch(`/api/tickets/${ticket.id}/relations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ relatedId: found.id, relationType: linkType }),
    });
    setLinkTicketNum("");
    router.refresh();
  }

  const currentStatus = statusOptions.find((s) => s.value === status);
  const existingTagIds = new Set(ticket.tags.map((t) => t.tag.id));
  const availableTags = allTags.filter((t) => !existingTagIds.has(t.id));

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1 ml-8 md:ml-0">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <a href="/admin/tickets" className="hover:text-blue-600">Tickets</a>
            <span>/</span>
            <span>#{ticket.number}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-gray-500">
            <span>{ticket.name}</span>
            <span>·</span>
            <a href={`mailto:${ticket.email}`} className="hover:text-blue-600">{ticket.email}</a>
            <span>·</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span>·</span>
            <a href={`/portal/tickets/${ticket.externalToken}`} target="_blank" className="text-blue-600 hover:underline">Portal-Link ↗</a>
          </div>
        </div>
        {saving && <span className="text-sm text-gray-400 animate-pulse">Speichern…</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-4">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Beschreibung</h3>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeContent(ticket.description) }} />
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
              {(["comments", "attachments", "relations", "audit"] as const).map((tab) => {
                const labels = { comments: `Kommentare (${ticket.comments.length})`, attachments: `Anhänge (${ticket.attachments.length})`, relations: "Verlinkungen", audit: "Verlauf" };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${activeTab === tab ? "bg-white text-blue-700 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-900"}`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {/* Comments Tab */}
              {activeTab === "comments" && (
                <div className="space-y-4">
                  {ticket.comments.map((c) => (
                    <div key={c.id} className={`p-4 rounded-lg border ${c.isInternal ? "bg-yellow-50 border-yellow-200" : c.authorType === "AGENT" ? "bg-blue-50 border-blue-100" : c.authorType === "SYSTEM" ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium ${c.authorType === "AGENT" ? "bg-blue-500" : c.authorType === "SYSTEM" ? "bg-gray-400" : "bg-green-500"}`}>
                          {c.authorName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{c.authorName}</span>
                        {c.isInternal && <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">Intern</span>}
                        {c.authorType === "SYSTEM" && <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">System</span>}
                        <span className="text-xs text-gray-400 ml-auto">{new Date(c.createdAt).toLocaleString("de-DE")}</span>
                      </div>
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeContent(c.body) }} />
                    </div>
                  ))}

                  {/* New Comment */}
                  <div className="border-t border-gray-100 pt-4">
                    <TiptapEditor
                      content={commentBody}
                      onChange={setCommentBody}
                      placeholder="Kommentar schreiben…"
                      ticketId={ticket.id}
                      apiKey={getApiKey()}
                    />
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={commentInternal} onChange={(e) => setCommentInternal(e.target.checked)} className="rounded" />
                        Intern (nicht für Kunden sichtbar)
                      </label>
                      {!commentInternal && (
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={notifyCreator} onChange={(e) => setNotifyCreator(e.target.checked)} className="rounded" />
                          Mail an Ersteller senden
                        </label>
                      )}
                      <button
                        onClick={handleSendComment}
                        disabled={sendingComment || !commentBody.trim()}
                        className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {sendingComment ? "Senden…" : "Kommentar senden"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === "attachments" && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <span className="text-2xl">📎</span>
                    <span className="text-sm text-gray-600">Datei anhängen (max. 20 MB)</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {ticket.attachments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Keine Anhänge</p>}
                  {ticket.attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xl">{a.mimeType.startsWith("image/") ? "🖼" : a.mimeType.includes("pdf") ? "📄" : "📎"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.filename}</p>
                        <p className="text-xs text-gray-400">{formatBytes(a.size)} · {new Date(a.createdAt).toLocaleDateString("de-DE")}</p>
                      </div>
                      <a href={a.driveUrl} target="_blank" className="text-sm text-blue-600 hover:underline shrink-0">Öffnen ↗</a>
                    </div>
                  ))}
                </div>
              )}

              {/* Relations Tab */}
              {activeTab === "relations" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={linkTicketNum} onChange={(e) => setLinkTicketNum(e.target.value)} placeholder="Ticket-Nummer oder Betreff" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    <select value={linkType} onChange={(e) => setLinkType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="linked">Verlinkt</option>
                      <option value="duplicate_of">Duplikat von</option>
                      <option value="merged_into">Zusammengeführt in</option>
                      <option value="blocks">Blockiert</option>
                      <option value="blocked_by">Blockiert von</option>
                    </select>
                    <button onClick={handleLinkTicket} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Verlinken</button>
                  </div>

                  {/* Merge section */}
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tickets zusammenführen</h4>
                    <p className="text-xs text-gray-400 mb-2">
                      Verknüpft dieses Ticket als &bdquo;Duplikat von&ldquo; dem Ziel-Ticket und setzt den Status auf Geschlossen.
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={linkTicketNum}
                        onChange={(e) => setLinkTicketNum(e.target.value)}
                        placeholder="Ziel-Ticket-Nummer"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        onClick={async () => {
                          if (!linkTicketNum) return;
                          const apiKey = getApiKey();
                          const res = await fetch(`/api/tickets?search=${linkTicketNum}`, { headers: { "x-api-key": apiKey } });
                          const data = await res.json();
                          const found = data.data?.[0];
                          if (!found) { alert("Ticket nicht gefunden"); return; }
                          // Create merged_into relation
                          await fetch(`/api/tickets/${ticket.id}/relations`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
                            body: JSON.stringify({ relatedId: found.id, relationType: "duplicate_of" }),
                          });
                          // Close this ticket
                          await fetch(`/api/tickets/${ticket.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json", "x-api-key": apiKey },
                            body: JSON.stringify({ status: "CLOSED" }),
                          });
                          setLinkTicketNum("");
                          router.refresh();
                        }}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                      >
                        Zusammenführen
                      </button>
                    </div>
                  </div>

                  {[...ticket.sourceRelations, ...ticket.targetRelations].length === 0 && <p className="text-sm text-gray-400 text-center py-4">Keine Verlinkungen</p>}
                  {ticket.sourceRelations.map((r) => r.related && (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">{r.relationType.replace(/_/g, " ")}</span>
                      <a href={`/admin/tickets/${r.related.id}`} className="text-sm text-blue-600 hover:underline">#{r.related.number} {r.related.subject}</a>
                    </div>
                  ))}
                  {ticket.targetRelations.map((r) => r.ticket && (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">{r.relationType.replace(/_/g, " ")} ←</span>
                      <a href={`/admin/tickets/${r.ticket.id}`} className="text-sm text-blue-600 hover:underline">#{r.ticket.number} {r.ticket.subject}</a>
                    </div>
                  ))}
                </div>
              )}

              {/* Audit Tab */}
              {activeTab === "audit" && (
                <div className="space-y-2">
                  {ticket.auditLogs.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Keine Einträge</p>}
                  {ticket.auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{log.action.replace(/_/g, " ")}</p>
                        {log.newValue != null && <p className="text-xs text-gray-400">{String(JSON.stringify(log.newValue)).slice(0, 100)}</p>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{new Date(log.createdAt).toLocaleString("de-DE")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status</h3>
            <div className="space-y-1">
              {statusOptions.map((s) => (
                <button key={s.value} onClick={() => handleStatusChange(s.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${status === s.value ? s.cls : "text-gray-600 hover:bg-gray-50"}`}>
                  {status === s.value ? "✓ " : ""}{s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Priorität</h3>
            <div className="space-y-1">
              {priorityOptions.map((p) => (
                <button key={p.value} onClick={() => handlePriorityChange(p.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${priority === p.value ? `bg-gray-100 ${p.cls}` : "text-gray-600 hover:bg-gray-50"}`}>
                  {priority === p.value ? "✓ " : ""}{p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Zuweisung</h3>
            <select value={assignedToId} onChange={(e) => handleAssignChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
              <option value="">– Nicht zugewiesen –</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ticket.tags.map((tt) => (
                <button key={tt.tag.id} onClick={() => handleRemoveTag(tt.tag.id)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: tt.tag.color }} title="Klicken zum Entfernen">
                  {tt.tag.name} ×
                </button>
              ))}
              {ticket.tags.length === 0 && <span className="text-xs text-gray-400">Keine Tags</span>}
            </div>
            {availableTags.length > 0 && (
              <select onChange={(e) => { if (e.target.value) handleAddTag(e.target.value); e.target.value = ""; }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500">
                <option value="">Tag hinzufügen…</option>
                {availableTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          {/* Watchers */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Beobachter</h3>
            <div className="space-y-1.5 mb-3">
              {watchers.length === 0 && <p className="text-xs text-gray-400">Keine Beobachter</p>}
              {watchers.map((w) => (
                <div key={w.agentId} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">{w.agent.name.charAt(0)}</div>
                  <span className="text-xs text-gray-700 flex-1">{w.agent.name}</span>
                  <button onClick={() => handleRemoveWatcher(w.agentId)} className="text-xs text-gray-400 hover:text-red-500">×</button>
                </div>
              ))}
            </div>
            {agents.filter(a => !watchers.some(w => w.agentId === a.id)).length > 0 && (
              <select
                onChange={(e) => { if (e.target.value) handleAddWatcher(e.target.value); e.target.value = ""; }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Beobachter hinzufügen…</option>
                {agents.filter(a => !watchers.some(w => w.agentId === a.id)).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Eigene Felder</h3>
              <div className="space-y-3">
                {customFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {field.label}{field.required && <span className="ml-1 text-red-500">*</span>}
                      {savingCustomField === field.id && <span className="ml-1 text-gray-400 font-normal">…</span>}
                    </label>
                    {field.type === "text" && (
                      <input
                        type="text"
                        value={customValues[field.id] ?? ""}
                        onChange={e => setCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        onBlur={e => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                    {field.type === "number" && (
                      <input
                        type="number"
                        value={customValues[field.id] ?? ""}
                        onChange={e => setCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        onBlur={e => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                    {field.type === "boolean" && (
                      <button
                        onClick={() => handleCustomFieldChange(field.id, customValues[field.id] === "true" ? "false" : "true")}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${customValues[field.id] === "true" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {customValues[field.id] === "true" ? "Ja" : "Nein"}
                      </button>
                    )}
                    {field.type === "select" && (
                      <select
                        value={customValues[field.id] ?? ""}
                        onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">– Bitte wählen –</option>
                        {(field.options ?? []).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-xs text-gray-500 space-y-1.5">
            <div className="flex justify-between"><span>Erstellt</span><span>{new Date(ticket.createdAt).toLocaleDateString("de-DE")}</span></div>
            <div className="flex justify-between"><span>Aktualisiert</span><span>{new Date(ticket.updatedAt).toLocaleDateString("de-DE")}</span></div>
            {ticket.resolvedAt && <div className="flex justify-between"><span>Geloest</span><span>{new Date(ticket.resolvedAt).toLocaleDateString("de-DE")}</span></div>}
            <div className="flex justify-between"><span>Status</span><span className={`font-medium ${currentStatus?.cls.split(" ")[1]}`}>{currentStatus?.label}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
