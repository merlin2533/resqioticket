import { redirect } from "next/navigation";
import Link from "next/link";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./LogoutButton";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  WAITING: "Wartend",
  RESOLVED: "Gelöst",
  CLOSED: "Geschlossen",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  WAITING: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const customer = await getCustomerFromRequest();
  if (!customer) redirect("/portal/login");

  const tickets = await prisma.ticket.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    select: {
      number: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      externalToken: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kunden-Portal</h1>
          <p className="text-sm text-gray-500">Willkommen, {customer.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Ticket einreichen
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meine Tickets</h2>

        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">Noch keine Tickets vorhanden.</p>
            <Link
              href="/portal/submit"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Erstes Ticket einreichen
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-16">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Betreff</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-36">Erstellt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((t) => (
                  <tr key={t.number} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">#{t.number}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/portal/tickets/${t.externalToken}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
