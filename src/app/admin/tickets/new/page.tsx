"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getApiKey() {
  if (typeof document !== "undefined") {
    return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  }
  return "";
}

const priorityOptions = [
  { value: "LOW",    label: "Niedrig" },
  { value: "MEDIUM", label: "Mittel" },
  { value: "HIGH",   label: "Hoch" },
  { value: "URGENT", label: "Dringend" },
];

type CustomerOption = { id: string; name: string; email: string };
type AgentOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; customers?: { customerId: string }[] };

export default function NewTicketPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    subject: "", name: "", email: "", priority: "MEDIUM", type: "INCIDENT", description: "",
    customerId: "", projectId: "", assignedToId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    const apiKey = getApiKey();
    fetch("/api/admin/customers", { headers: { "x-api-key": apiKey } })
      .then(r => r.json()).then(d => setCustomers(d.data ?? [])).catch(() => {});
    fetch("/api/agents", { headers: { "x-api-key": apiKey } })
      .then(r => r.json()).then(d => setAgents(d.data ?? [])).catch(() => {});
    fetch("/api/projects", { headers: { "x-api-key": apiKey } })
      .then(r => r.json()).then(d => setProjects(d.data ?? [])).catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleCustomerChange(customerId: string) {
    if (customerId) {
      const c = customers.find(c => c.id === customerId);
      if (c) {
        setForm(prev => ({ ...prev, customerId, name: c.name, email: c.email }));
      }
    } else {
      setForm(prev => ({ ...prev, customerId: "", name: "", email: "" }));
    }
  }

  const filteredProjects = form.customerId
    ? projects.filter(p => p.customers?.some(pc => pc.customerId === form.customerId))
    : projects;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload: Record<string, string> = {
        subject: form.subject, name: form.name, email: form.email,
        priority: form.priority, type: form.type, description: form.description,
      };
      if (form.customerId) payload.customerId = form.customerId;
      if (form.projectId) payload.projectId = form.projectId;
      if (form.assignedToId) payload.assignedToId = form.assignedToId;

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Fehler ${res.status}`);
        return;
      }

      const data = await res.json();
      router.push(`/admin/tickets/${data.data.id}`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler – bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 ml-8 md:ml-0">Neues Ticket erstellen</h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Betreff <span className="text-red-500">*</span>
            </label>
            <input id="subject" name="subject" type="text" required value={form.subject}
              onChange={handleChange} placeholder="Kurze Beschreibung des Problems"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
          </div>

          {/* Customer + Agent assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
              <select id="customerId" name="customerId" value={form.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition">
                <option value="">– Kein Kunde –</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="assignedToId" className="block text-sm font-medium text-gray-700 mb-1">
                Zugewiesen an
              </label>
              <select
                id="assignedToId"
                name="assignedToId"
                value={form.assignedToId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="">– Nicht zugewiesen –</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Project */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">Projekt</label>
              <select id="projectId" name="projectId" value={form.projectId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition">
                <option value="">– Kein Projekt –</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input id="name" name="name" type="text" required value={form.name}
                onChange={handleChange} placeholder="Vor- und Nachname"
                disabled={!!form.customerId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-50 disabled:text-gray-500" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail <span className="text-red-500">*</span>
              </label>
              <input id="email" name="email" type="email" required value={form.email}
                onChange={handleChange} placeholder="kunde@beispiel.de"
                disabled={!!form.customerId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-50 disabled:text-gray-500" />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
            <select id="priority" name="priority" value={form.priority} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
              {priorityOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
            <select id="type" name="type" value={form.type} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
              <option value="INCIDENT">Incident</option>
              <option value="SERVICE_REQUEST">Service Request</option>
              <option value="CHANGE_REQUEST">Change Request</option>
              <option value="PROBLEM">Problem</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung <span className="text-red-500">*</span>
            </label>
            <textarea id="description" name="description" required rows={6} value={form.description}
              onChange={handleChange} placeholder="Detaillierte Beschreibung des Anliegens…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-y" />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition">
              {saving ? "Wird erstellt…" : "Ticket erstellen"}
            </button>
            <Link href="/admin/tickets"
              className="px-5 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition">
              Abbrechen
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
