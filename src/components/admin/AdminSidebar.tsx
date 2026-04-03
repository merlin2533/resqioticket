"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const nav = [
  { href: "/admin",             label: "Dashboard",    icon: "▦" },
  { href: "/admin/tickets",     label: "Tickets",      icon: "✉" },
  { href: "/admin/stats",       label: "Statistiken",  icon: "📊" },
  { href: "/admin/agents",      label: "Agenten",      icon: "👥" },
  { href: "/admin/customers",   label: "Kunden",       icon: "🏢" },
  { href: "/admin/templates",   label: "Vorlagen",     icon: "📋" },
  { href: "/admin/automations",   label: "Automatisierung", icon: "⚡" },
  { href: "/admin/custom-fields", label: "Eigene Felder",   icon: "🔧" },
  { href: "/admin/api-docs",      label: "API Docs",        icon: "📖" },
  { href: "/admin/audit",         label: "Audit-Log",       icon: "📜" },
  { href: "/admin/settings",         label: "Einstellungen",  icon: "⚙" },
  { href: "/admin/email-templates",  label: "E-Mail-Vorlagen", icon: "📧" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await Promise.all([
      fetch("/api/admin/auth", { method: "DELETE" }),
      fetch("/api/admin/agent-auth", { method: "DELETE" }),
    ]);
    window.location.href = "/admin/login";
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-2 left-2 z-50 p-2 bg-white rounded-lg border border-gray-200 shadow-sm"
        aria-label="Menü öffnen"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-56 bg-white border-r border-gray-200 flex flex-col shrink-0
        transform transition-transform duration-200 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}>
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <span className="font-bold text-lg text-gray-900">ResQio</span>
            <span className="ml-2 text-xs text-gray-400 font-medium">Admin</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1 text-gray-400 hover:text-gray-600"
            aria-label="Menü schließen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <span>↩</span> Abmelden
          </button>
        </div>
      </aside>
    </>
  );
}
