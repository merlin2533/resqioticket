"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date | string;
  _count: { tickets: number };
};

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

export function CustomersClient({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const a = document.createElement("a");
    a.href = `/api/admin/customers/export?_=${Date.now()}`;
    const cookie = document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
    // Use fetch to get the file with auth header
    fetch("/api/admin/customers/export", { headers: { "x-api-key": cookie } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `kunden-${new Date().toISOString().split("T")[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/customers/import", {
      method: "POST",
      headers: { "x-api-key": getApiKey() },
      body: fd,
    });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      setImportMsg(`${data.created} importiert, ${data.skipped} übersprungen`);
      router.refresh();
    } else {
      setImportMsg(data.error ?? "Fehler beim Import");
    }
    if (importRef.current) importRef.current.value = "";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Fehler"); return; }
    setShowForm(false); setForm({ name: "", email: "", password: "" });
    router.refresh();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  async function handleResetPassword(id: string) {
    if (!newPassword || newPassword.length < 6) { setError("Mindestens 6 Zeichen"); return; }
    await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({ password: newPassword }),
    });
    setResetId(null); setNewPassword(""); router.refresh();
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 ml-8 md:ml-0">Kunden</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            Export Excel
          </button>
          <label className={`px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            {importing ? "Importiere..." : "Import Excel"}
            <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Kunde anlegen
          </button>
        </div>
      </div>
      {importMsg && (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">{importMsg}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Neuer Kunde</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Max Mustermann" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-Mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="max@beispiel.de" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Passwort</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Mindestens 6 Zeichen" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "..." : "Erstellen"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">E-Mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-20">Tickets</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 w-36">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {customers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Noch keine Kunden angelegt</td></tr>
            )}
            {customers.map((c) => (
              <>
                <tr key={c.id} className={`${!c.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">{c.name.charAt(0)}</div>
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.email}</td>
                  <td className="px-4 py-3 text-gray-500">{c._count.tickets}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(c.id, c.isActive)} className={`text-xs px-2 py-1 rounded-full font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {c.isActive ? "Aktiv" : "Inaktiv"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setResetId(resetId === c.id ? null : c.id); setNewPassword(""); setError(""); }} className="text-xs px-2 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                      Passwort
                    </button>
                  </td>
                </tr>
                {resetId === c.id && (
                  <tr key={`${c.id}-reset`} className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Neues Passwort (mind. 6 Zeichen)"
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-full sm:w-72"
                        />
                        <button onClick={() => handleResetPassword(c.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                          Speichern
                        </button>
                        <button onClick={() => { setResetId(null); setNewPassword(""); }} className="px-3 py-1.5 text-gray-500 border border-gray-300 rounded-lg text-sm hover:bg-gray-100">
                          Abbrechen
                        </button>
                        {error && <span className="text-sm text-red-600">{error}</span>}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
