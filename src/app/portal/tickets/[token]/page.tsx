import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CommentForm } from "./comment-form";

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Offen", color: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "In Bearbeitung", color: "bg-yellow-100 text-yellow-800" },
  WAITING: { label: "Wartend", color: "bg-orange-100 text-orange-800" },
  RESOLVED: { label: "Geloest", color: "bg-green-100 text-green-800" },
  CLOSED: { label: "Geschlossen", color: "bg-gray-100 text-gray-800" },
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  LOW: { label: "Niedrig", color: "bg-gray-100 text-gray-600" },
  MEDIUM: { label: "Mittel", color: "bg-blue-100 text-blue-600" },
  HIGH: { label: "Hoch", color: "bg-orange-100 text-orange-600" },
  URGENT: { label: "Dringend", color: "bg-red-100 text-red-600" },
};

export default async function TicketPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { externalToken: token },
    include: {
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const status = statusLabels[ticket.status] || { label: ticket.status, color: "bg-gray-100" };
  const priority = priorityLabels[ticket.priority] || {
    label: ticket.priority,
    color: "bg-gray-100",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Ticket #{ticket.number}</span>
            <span>&middot;</span>
            <span>
              Erstellt am{" "}
              {ticket.createdAt.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
          <div className="flex gap-2 mt-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
              {status.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${priority.color}`}>
              {priority.label}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Ticket description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {ticket.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{ticket.name}</p>
              <p className="text-sm text-gray-500">{ticket.email}</p>
            </div>
          </div>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: ticket.description }}
          />
        </div>

        {/* Comments */}
        {ticket.comments.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-gray-900">Kommentare</h2>
            {ticket.comments.map((comment) => (
              <div
                key={comment.id}
                className={`bg-white rounded-lg shadow-sm border p-6 ${
                  comment.authorType === "SYSTEM"
                    ? "border-gray-300 bg-gray-50"
                    : comment.authorType === "AGENT"
                      ? "border-blue-200"
                      : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      comment.authorType === "AGENT"
                        ? "bg-blue-500"
                        : comment.authorType === "SYSTEM"
                          ? "bg-gray-400"
                          : "bg-green-500"
                    }`}
                  >
                    {comment.authorType === "SYSTEM"
                      ? "S"
                      : comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {comment.authorName}
                      {comment.authorType === "AGENT" && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Mitarbeiter
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {comment.createdAt.toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: comment.body }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Comment form */}
        {ticket.status !== "CLOSED" && (
          <CommentForm ticketToken={token} />
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          ResQio Ticket System
        </div>
      </footer>
    </div>
  );
}
