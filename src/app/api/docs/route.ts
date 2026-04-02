import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "ResQio Ticket System API",
    version: "1.0.0",
    description: "REST API for the ResQio ticket system. Authenticate via `x-api-key` header.",
  },
  servers: [{ url: process.env.APP_URL ?? "http://localhost:3000", description: "Current server" }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
    },
    schemas: {
      Ticket: {
        type: "object",
        properties: {
          id: { type: "string" }, number: { type: "integer" },
          subject: { type: "string" }, description: { type: "string" },
          status: { type: "string", enum: ["OPEN","IN_PROGRESS","WAITING","RESOLVED","CLOSED"] },
          priority: { type: "string", enum: ["LOW","MEDIUM","HIGH","URGENT"] },
          email: { type: "string" }, name: { type: "string" },
          assignedToId: { type: "string", nullable: true },
          slaDeadline: { type: "string", format: "date-time", nullable: true },
          slaBreached: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "string" }, ticketId: { type: "string" },
          authorType: { type: "string", enum: ["AGENT","CUSTOMER","SYSTEM"] },
          authorName: { type: "string" }, authorEmail: { type: "string" },
          body: { type: "string" }, isInternal: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Agent: {
        type: "object",
        properties: {
          id: { type: "string" }, email: { type: "string" }, name: { type: "string" },
          role: { type: "string", enum: ["ADMIN","AGENT"] }, isActive: { type: "boolean" },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/api/tickets": {
      get: {
        summary: "List tickets",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "priority", in: "query", schema: { type: "string" } },
          { name: "assignedTo", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { "200": { description: "List of tickets" } },
      },
      post: {
        summary: "Create ticket",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object", required: ["subject","description","email","name"],
            properties: {
              subject: { type: "string" }, description: { type: "string" },
              email: { type: "string" }, name: { type: "string" },
              priority: { type: "string", enum: ["LOW","MEDIUM","HIGH","URGENT"], default: "MEDIUM" },
            },
          }}},
        },
        responses: { "201": { description: "Created ticket" } },
      },
    },
    "/api/tickets/{id}": {
      get: { summary: "Get ticket by ID", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Ticket" } } },
      patch: { summary: "Update ticket", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Updated ticket" } } },
    },
    "/api/tickets/{id}/comments": {
      get: { summary: "List comments", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Comments" } } },
      post: { summary: "Add comment", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "201": { description: "Created comment" } } },
    },
    "/api/tickets/bulk": {
      post: {
        summary: "Bulk action on tickets",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object", required: ["ids","action"],
            properties: {
              ids: { type: "array", items: { type: "string" } },
              action: { type: "string", enum: ["set_status","set_priority","assign","add_tag","delete"] },
              value: { type: "string" },
            },
          }}},
        },
        responses: { "200": { description: "Result" } },
      },
    },
    "/api/agents": {
      get: { summary: "List agents", responses: { "200": { description: "Agents" } } },
      post: { summary: "Create agent", responses: { "201": { description: "Created agent" } } },
    },
    "/api/tags": {
      get: { summary: "List tags", responses: { "200": { description: "Tags" } } },
      post: { summary: "Create tag", responses: { "201": { description: "Created tag" } } },
    },
    "/api/settings": {
      get: { summary: "Get settings", responses: { "200": { description: "Settings" } } },
      patch: { summary: "Update settings", responses: { "200": { description: "Updated settings" } } },
    },
    "/api/stats": {
      get: { summary: "Get dashboard statistics", responses: { "200": { description: "Stats" } } },
    },
    "/api/custom-fields": {
      get: { summary: "List custom fields", responses: { "200": { description: "Custom fields" } } },
      post: { summary: "Create custom field", responses: { "201": { description: "Created" } } },
    },
    "/api/health": {
      get: { summary: "Health check", security: [], responses: { "200": { description: "OK" } } },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
