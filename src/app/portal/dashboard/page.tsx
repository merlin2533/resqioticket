import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { verifyAgentToken } from "@/lib/agent-session";
import { LogoutButton } from "./LogoutButton";
import { NotificationPreferencesCard } from "./NotificationPreferencesCard";
import { PortalTicketSearch } from "./PortalTicketSearch";

export const dynamic = "force-dynamic";

async function isAdminOrAgent(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session")?.value;
  if (adminSession && process.env.API_KEY && adminSession === process.env.API_KEY) return true;
  const agentToken = cookieStore.get("agent_session")?.value;
  if (agentToken) {
    const data = await verifyAgentToken(agentToken);
    if (data) return true;
  }
  return false;
}

export default async function PortalDashboardPage() {
  const customer = await getCustomerFromRequest();
  if (!customer) redirect("/portal/login");

  const showAdminButton = await isAdminOrAgent();

  const customerPrefs = await prisma.customer.findUnique({
    where: { id: customer.id },
    select: { notifyOnComment: true, notifyOnStatusChange: true },
  });

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
          {showAdminButton && (
            <Link
              href="/admin"
              className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
            >
              Admin-Bereich →
            </Link>
          )}
          <Link
            href="/portal/submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Ticket einreichen
          </Link>
          <Link
            href="/portal/profile"
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Profil
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meine Tickets</h2>

        <PortalTicketSearch tickets={tickets} />
        <div className="mt-8">
          <NotificationPreferencesCard
            initialNotifyOnComment={customerPrefs?.notifyOnComment ?? true}
            initialNotifyOnStatusChange={customerPrefs?.notifyOnStatusChange ?? true}
          />
        </div>
      </main>
    </div>
  );
}
