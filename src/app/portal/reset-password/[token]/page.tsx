"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwörter stimmen nicht überein");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: form.password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/portal/dashboard");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Fehler beim Zurücksetzen");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Neues Passwort</h1>
        <p className="text-sm text-gray-500 mb-6">Geben Sie Ihr neues Passwort ein.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mind. 8 Zeichen"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              required
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "..." : "Passwort speichern"}
          </button>
        </form>
      </div>
    </div>
  );
}
