import Link from "next/link";

export default function PortalPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm w-full px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kunden-Portal</h1>
        <p className="text-gray-500 mb-10">Tickets einreichen und verwalten</p>

        <div className="space-y-3">
          <Link
            href="/portal/login"
            className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
          >
            Anmelden
          </Link>
          <p className="text-xs text-gray-400">
            Zugang wird vom Support-Team eingerichtet
          </p>
        </div>
      </div>
    </div>
  );
}
