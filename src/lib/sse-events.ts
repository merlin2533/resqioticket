import { EventEmitter } from "events";

// Global singleton – works in single-instance Docker deployment
const globalEmitter = global as unknown as { __sseEmitter?: EventEmitter };

if (!globalEmitter.__sseEmitter) {
  globalEmitter.__sseEmitter = new EventEmitter();
  globalEmitter.__sseEmitter.setMaxListeners(200);
}

export const sseEmitter = globalEmitter.__sseEmitter;

export type TicketEvent = {
  id: string;
  type: "ticket_created" | "ticket_updated" | "comment_added";
  ticketId: string;
  ticketNumber: number;
  subject: string;
  message: string;
  timestamp: string;
  agentId?: string; // if event is for a specific agent only (null = broadcast to all)
};

export function emitTicketEvent(event: Omit<TicketEvent, "id" | "timestamp">): void {
  const full: TicketEvent = {
    ...event,
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
  };
  sseEmitter.emit("ticket_event", full);
}
