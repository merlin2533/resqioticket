import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(500),
  description: z.string().min(1, "Description is required").max(100000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(200),
  metadata: z.any().optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
});

export const updateTicketSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1, "Comment body is required").max(100000),
  authorType: z.enum(["AGENT", "CUSTOMER", "SYSTEM"]).optional().default("AGENT"),
  authorId: z.string().optional(),
  authorName: z.string().min(1, "Author name is required"),
  authorEmail: z.string().email("Invalid email address"),
  isInternal: z.boolean().optional().default(false),
});

export const createAgentSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(200),
  role: z.enum(["ADMIN", "AGENT"]).optional().default("AGENT"),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(["ADMIN", "AGENT"]).optional(),
  isActive: z.boolean().optional(),
  reminderEnabled: z.boolean().optional(),
  notifyOnNewTicket: z.boolean().optional(),
  notifyOnComment: z.boolean().optional(),
  notifyOnStatusChange: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export const ticketQuerySchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedTo: z.string().optional(),
  email: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "priority", "number"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const inboundEmailSchema = z.object({
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  text: z.string().optional().default(""),
  html: z.string().optional().default(""),
  headers: z.record(z.string(), z.string()).optional(),
});

export const portalCommentSchema = z.object({
  body: z.string().min(1, "Comment is required").max(100000),
  authorName: z.string().min(1, "Name is required"),
  authorEmail: z.string().email("Invalid email"),
});
