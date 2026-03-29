export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">ResQio Ticket</h1>
        <p className="text-lg text-gray-600 mb-8">
          Modernes API-first Ticketsystem
        </p>
        <div className="mb-8 flex gap-3 justify-center">
          <a
            href="/portal"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Kunden-Portal
          </a>
          <a
            href="/admin/login"
            className="inline-block bg-gray-800 hover:bg-gray-900 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Admin Login
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto text-left">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-1">API</h3>
            <p className="text-sm text-gray-600">
              REST-API fuer Tickets, Kommentare und Agenten
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-1">E-Mail</h3>
            <p className="text-sm text-gray-600">
              Eingehende E-Mails werden automatisch zu Tickets
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Portal</h3>
            <p className="text-sm text-gray-600">
              Externer Zugriff per sicherem Link
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Erinnerungen</h3>
            <p className="text-sm text-gray-600">
              Automatische Benachrichtigungen bei offenen Tickets
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
