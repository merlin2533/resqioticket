"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CommentFormProps {
  ticketToken: string;
  customerName?: string;
  customerEmail?: string;
}

export function CommentForm({ ticketToken, customerName, customerEmail }: CommentFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [name, setName] = useState(customerName ?? "");
  const [email, setEmail] = useState(customerEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasStoredIdentity, setHasStoredIdentity] = useState(false);

  useEffect(() => {
    if (customerName && customerEmail) {
      setHasStoredIdentity(true);
      return;
    }
    const storedName = localStorage.getItem("portal_user_name");
    const storedEmail = localStorage.getItem("portal_user_email");
    if (storedName && storedEmail) {
      setName(storedName);
      setEmail(storedEmail);
      setHasStoredIdentity(true);
    }
  }, [customerName, customerEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/portal/tickets/${ticketToken}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, authorName: name, authorEmail: email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Senden");
      }

      // Save identity to localStorage
      localStorage.setItem("portal_user_name", name);
      localStorage.setItem("portal_user_email", email);

      setBody("");
      // Immediately refresh to show new comment
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Antworten</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!hasStoredIdentity && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="Ihr Name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="ihre@email.de" />
            </div>
          </div>
        )}

        {hasStoredIdentity && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
              {name.charAt(0).toUpperCase()}
            </div>
            <span>{name}</span>
            <button type="button" onClick={() => { setHasStoredIdentity(false); }} className="text-xs text-blue-600 hover:underline ml-1">
              Ändern
            </button>
          </div>
        )}

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">Nachricht</label>
          <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} required rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="Ihre Nachricht..." />
        </div>

        <button type="submit" disabled={submitting || !name || !email}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors">
          {submitting ? "Senden..." : "Kommentar senden"}
        </button>
      </form>
    </div>
  );
}
