import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth";
import { z } from "zod";

const assignCustomerSchema = z.object({
  customerId: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const projectCustomers = await prisma.projectCustomer.findMany({
    where: { projectId },
    include: {
      customer: {
        select: { id: true, name: true, email: true, isActive: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: projectCustomers.map((pc) => pc.customer) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id: projectId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.data.customerId },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const existing = await prisma.projectCustomer.findUnique({
    where: {
      projectId_customerId: { projectId, customerId: parsed.data.customerId },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Customer already assigned to this project" },
      { status: 409 }
    );
  }

  await prisma.projectCustomer.create({
    data: { projectId, customerId: parsed.data.customerId },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id: projectId } = await params;
  const customerId = request.nextUrl.searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json(
      { error: "customerId query parameter is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.projectCustomer.findUnique({
    where: { projectId_customerId: { projectId, customerId } },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Customer not assigned to this project" },
      { status: 404 }
    );
  }

  await prisma.projectCustomer.delete({
    where: { projectId_customerId: { projectId, customerId } },
  });

  return NextResponse.json({ success: true });
}
