import { NextRequest } from "next/server";
import { sseEmitter, TicketEvent } from "@/lib/sse-events";
import { verifyAgentToken } from "@/lib/agent-session";

async function isAuthenticated(request: NextRequest): Promise<{ ok: boolean; agentId?: string; role?: string }> {
  // Check cookies from request
  const adminSession = request.cookies.get("admin_session")?.value;
  if (adminSession && process.env.API_KEY && adminSession === process.env.API_KEY) {
    return { ok: true };
  }
  const agentToken = request.cookies.get("agent_session")?.value;
  if (agentToken) {
    const data = await verifyAgentToken(agentToken);
    if (data) return { ok: true, agentId: data.agentId, role: data.role };
  }
  return { ok: false };
}

export async function GET(request: NextRequest) {
  const auth = await isAuthenticated(request);
  if (!auth.ok) {
    return new Response("Unauthorized", { status: 401 });
  }

  const agentId = auth.agentId;
  const isAgentRole = auth.role === "AGENT";

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(data: unknown) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          doCleanup();
        }
      }

      function doCleanup() {
        if (cleanup) { cleanup(); cleanup = null; }
      }

      const handler = (event: TicketEvent) => {
        // AGENT role: only receive events relevant to them (assigned tickets)
        if (isAgentRole && agentId && event.agentId && event.agentId !== agentId) return;
        send(event);
      };

      sseEmitter.on("ticket_event", handler);

      // Heartbeat every 25 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          doCleanup();
          clearInterval(heartbeatInterval);
        }
      }, 25000);

      cleanup = () => {
        sseEmitter.off("ticket_event", handler);
        clearInterval(heartbeatInterval);
        try { controller.close(); } catch { /* already closed */ }
      };

      // Send initial connection confirmation
      send({ type: "connected", timestamp: new Date().toISOString() });

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        doCleanup();
        clearInterval(heartbeatInterval);
      });
    },
    cancel() {
      if (cleanup) { cleanup(); cleanup = null; }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
