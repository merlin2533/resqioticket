"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/portal/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Passwort vergessen</h1>
        {sent ? (
          <div>
            <p className="text-sm text-gray-600 mt-4">
              Falls ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet. Bitte prüfen Sie Ihr Postfach.
            </p>
            <Link href="/portal/login" className="block text-center mt-4 text-sm text-blue-600 hover:underline">
              Zurück zur Anmeldung
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">Geben Sie Ihre E-Mail ein, um einen Reset-Link zu erhalten.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@beispiel.de"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "..." : "Reset-Link senden"}
              </button>
            </form>
            <p className="text-center text-xs text-gray-400 mt-4">
              <Link href="/portal/login" className="text-blue-600 hover:underline">Zurück zur Anmeldung</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
