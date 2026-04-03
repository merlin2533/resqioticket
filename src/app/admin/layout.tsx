import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { NotificationBell } from "@/components/NotificationBell";

export const metadata: Metadata = {
  title: "ResQio Admin",
  description: "Ticket System Administration",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar with notification bell */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-end px-4 shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
