"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/admin",             label: "Dashboard",    icon: "▦" },
  { href: "/admin/tickets",     label: "Tickets",      icon: "✉" },
  { href: "/admin/agents",      label: "Agenten",      icon: "👥" },
  { href: "/admin/customers",   label: "Kunden",       icon: "🏢" },
  { href: "/admin/templates",   label: "Vorlagen",     icon: "📋" },
  { href: "/admin/automations",   label: "Automatisierung", icon: "⚡" },
  { href: "/admin/custom-fields", label: "Eigene Felder",   icon: "🔧" },
  { href: "/admin/api-docs",      label: "API Docs",        icon: "📖" },
  { href: "/admin/audit",         label: "Audit-Log",       icon: "📜" },
  { href: "/admin/settings",         label: "Einstellungen",  icon: "⚙" },
  { href: "/admin/email-templates",  label: "E-Mail-Vorlagen", icon: "✉" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    await Promise.all([
      fetch("/api/admin/auth", { method: "DELETE" }),
      fetch("/api/admin/agent-auth", { method: "DELETE" }),
    ]);
    window.location.href = "/admin/login";
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="font-bold text-lg text-gray-900">ResQio</span>
        <span className="ml-2 text-xs text-gray-400 font-medium">Admin</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
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
  );
}
