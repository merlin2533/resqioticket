"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  id: string;
  reminderEnabled: boolean;
  reminderIntervalHours: number;
  escalationDays: number;
  emailFrom: string;
  centralNotifyEmail: string | null;
  notifyAgentOnComment: boolean;
  notifyCreatorOnComment: boolean;
  slackWebhookUrl: string | null;
  teamsWebhookUrl: string | null;
  slaEnabled: boolean;
  slaLowHours: number;
  slaMediumHours: number;
  slaHighHours: number;
  slaUrgentHours: number;
};

function getApiKey() {
  if (typeof document !== "undefined") return document.cookie.match(/admin_session=([^;]+)/)?.[1] ?? "";
  return "";
}

function Toggle({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex items-start gap-4 cursor-pointer group">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5 ${value ? "bg-blue-600" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

export function SettingsClient({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...settings,
    centralNotifyEmail: settings.centralNotifyEmail ?? "",
    slackWebhookUrl: settings.slackWebhookUrl ?? "",
    teamsWebhookUrl: settings.teamsWebhookUrl ?? "",
    slaEnabled: settings.slaEnabled ?? false,
    slaLowHours: settings.slaLowHours ?? 72,
    slaMediumHours: settings.slaMediumHours ?? 48,
    slaHighHours: settings.slaHighHours ?? 24,
    slaUrgentHours: settings.slaUrgentHours ?? 4,
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": getApiKey() },
      body: JSON.stringify({
        ...form,
        centralNotifyEmail: form.centralNotifyEmail || null,
        slackWebhookUrl: form.slackWebhookUrl || null,
        teamsWebhookUrl: form.teamsWebhookUrl || null,
        slaEnabled: form.slaEnabled,
        slaLowHours: form.slaLowHours,
        slaMediumHours: form.slaMediumHours,
        slaHighHours: form.slaHighHours,
        slaUrgentHours: form.slaUrgentHours,
      }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function handleSeedTemplates() {
    setSeeding(true);
    const res = await fetch("/api/email-templates", {
      method:  "POST",
      headers: { "x-api-key": getApiKey() },
    });
    const data = await res.json();
    setSeedMsg(data.message ?? "Seeded");
    setSeeding(false);
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Einstellungen</h1>

      <form onSubmit={handleSave} className="space-y-8">

        {/* E-Mail Benachrichtigungen */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">E-Mail Benachrichtigungen</h2>
          <p className="text-sm text-gray-500 mb-6">Wer wird bei neuen Kommentaren benachrichtigt?</p>

          <div className="space-y-5">
            <Toggle
              value={form.notifyCreatorOnComment}
              onChange={(v) => set("notifyCreatorOnComment", v)}
              label="Ticket-Ersteller bei Agent-Kommentar benachrichtigen"
              description="Kunde erhält eine E-Mail, wenn ein Agent antwortet. Kann per Kommentar überschrieben werden."
            />
            <Toggle
              value={form.notifyAgentOnComment}
              onChange={(v) => set("notifyAgentOnComment", v)}
              label="Zugewiesenen Bearbeiter bei Kunden-Kommentar benachrichtigen"
              description="Agent erhält eine E-Mail, wenn der Kunde eine neue Nachricht schreibt."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zentrale Benachrichtigungsadresse
              </label>
              <input
                type="email"
                value={form.centralNotifyEmail}
                onChange={(e) => set("centralNotifyEmail", e.target.value)}
                placeholder="zentrale@firma.de (leer = deaktiviert)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Bei <em>jedem</em> öffentlichen Kommentar wird eine Kopie an diese Adresse gesendet.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Absender-E-Mail</label>
              <input
                type="email"
                value={form.emailFrom}
                onChange={(e) => set("emailFrom", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Webhook-Integrationen */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Webhook-Integrationen</h2>
          <p className="text-sm text-gray-500 mb-6">
            Benachrichtigungen an Slack und Microsoft Teams senden bei: neues Ticket, Statusänderung, neuer öffentlicher Kommentar.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slack Incoming Webhook URL
              </label>
              <input
                type="url"
                value={form.slackWebhookUrl}
                onChange={(e) => set("slackWebhookUrl", e.target.value)}
                placeholder="https://hooks.slack.com/services/… (leer = deaktiviert)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Incoming Webhook in Slack unter <em>Apps → Incoming WebHooks</em> erstellen.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Microsoft Teams Webhook URL
              </label>
              <input
                type="url"
                value={form.teamsWebhookUrl}
                onChange={(e) => set("teamsWebhookUrl", e.target.value)}
                placeholder="https://… .webhook.office.com/… (leer = deaktiviert)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Incoming Webhook im Teams-Kanal unter <em>Connectors → Incoming Webhook</em> erstellen.
              </p>
            </div>
          </div>
        </section>

        {/* SLA-Verwaltung */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">SLA-Verwaltung</h2>
          <p className="text-sm text-gray-500 mb-6">
            Service Level Agreements – maximale Bearbeitungszeit pro Priorität. Der Cron-Job markiert überschrittene Tickets automatisch.
          </p>
          <div className="space-y-5">
            <Toggle
              value={form.slaEnabled}
              onChange={(v) => set("slaEnabled", v)}
              label="SLA-Überwachung aktiviert"
              description="Setzt Deadlines auf neue Tickets und markiert sie bei Überschreitung."
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Niedrig (Stunden)</label>
                <input type="number" min={1} value={form.slaLowHours} onChange={(e) => set("slaLowHours", parseInt(e.target.value, 10))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mittel (Stunden)</label>
                <input type="number" min={1} value={form.slaMediumHours} onChange={(e) => set("slaMediumHours", parseInt(e.target.value, 10))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hoch (Stunden)</label>
                <input type="number" min={1} value={form.slaHighHours} onChange={(e) => set("slaHighHours", parseInt(e.target.value, 10))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dringend (Stunden)</label>
                <input type="number" min={1} value={form.slaUrgentHours} onChange={(e) => set("slaUrgentHours", parseInt(e.target.value, 10))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </section>

        {/* Erinnerungen */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Erinnerungen & Eskalation</h2>
          <p className="text-sm text-gray-500 mb-6">Automatische Cron-basierte Erinnerungen für offene Tickets.</p>

          <div className="space-y-5">
            <Toggle
              value={form.reminderEnabled}
              onChange={(v) => set("reminderEnabled", v)}
              label="Erinnerungen global aktiviert"
              description="Kann zusätzlich pro Agent deaktiviert werden."
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Erinnerungsintervall (Stunden)</label>
                <input
                  type="number" min={1} max={168}
                  value={form.reminderIntervalHours}
                  onChange={(e) => set("reminderIntervalHours", parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Eskalation nach (Tagen)</label>
                <input
                  type="number" min={1} max={30}
                  value={form.escalationDays}
                  onChange={(e) => set("escalationDays", parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Priorität wird automatisch erhöht.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Speichern…" : "Einstellungen speichern"}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Gespeichert</span>}
        </div>
      </form>

      {/* Template seeder */}
      <section className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">E-Mail-Vorlagen</h2>
        <p className="text-sm text-gray-500 mb-4">
          Erstellt Standard-Vorlagen in der Datenbank, falls noch keine vorhanden sind. Bestehende werden nicht überschrieben.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={handleSeedTemplates} disabled={seeding} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            {seeding ? "Wird erstellt…" : "Standard-Vorlagen anlegen"}
          </button>
          {seedMsg && <span className="text-sm text-green-600">{seedMsg}</span>}
          <a href="/admin/email-templates" className="text-sm text-blue-600 hover:underline ml-auto">Vorlagen bearbeiten →</a>
        </div>
      </section>
    </div>
  );
}
