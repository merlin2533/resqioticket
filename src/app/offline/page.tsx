export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="mb-4 text-6xl">📡</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Keine Verbindung
        </h1>
        <p className="mb-6 text-gray-600">
          Du bist offline. Bitte überprüfe deine Internetverbindung und
          versuche es erneut.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-slate-900 px-6 py-3 text-white hover:bg-slate-800 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
