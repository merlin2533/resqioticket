import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session-token";
import { verifyAgentToken } from "@/lib/agent-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const apiKey = process.env.API_KEY;

  // Protect all /admin routes except login pages
  if (
    pathname.startsWith("/admin") &&
    pathname !== "/admin/login" &&
    pathname !== "/admin/agent-login"
  ) {
    const adminSession = request.cookies.get("admin_session")?.value;

    // Accept API key session (superadmin)
    if (adminSession && apiKey && adminSession === apiKey) {
      return NextResponse.next();
    }

    // Accept agent session
    const agentToken = request.cookies.get("agent_session")?.value;
    if (agentToken) {
      const agentData = await verifyAgentToken(agentToken);
      if (agentData) {
        // Forward agent info as request headers for server components
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-agent-id", agentData.agentId);
        requestHeaders.set("x-agent-role", agentData.role);
        requestHeaders.set("x-agent-name", agentData.name);
        requestHeaders.set("x-agent-email", agentData.email);
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    }

    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // For API routes: verify session and set x-agent-verified header
  // This allows validateApiKey() to accept both admin API key and agent sessions
  if (pathname.startsWith("/api/")) {
    const requestHeaders = new Headers(request.headers);
    // Always strip to prevent spoofing
    requestHeaders.delete("x-agent-verified");
    requestHeaders.delete("x-agent-id");
    requestHeaders.delete("x-agent-role");
    requestHeaders.delete("x-agent-name");
    requestHeaders.delete("x-agent-email");

    // Verify admin_session cookie
    const adminSession = request.cookies.get("admin_session")?.value;
    if (adminSession && apiKey && adminSession === apiKey) {
      requestHeaders.set("x-agent-verified", "1");
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Verify agent_session cookie
    const agentToken = request.cookies.get("agent_session")?.value;
    if (agentToken) {
      const agentData = await verifyAgentToken(agentToken);
      if (agentData) {
        requestHeaders.set("x-agent-verified", "1");
        requestHeaders.set("x-agent-id", agentData.agentId);
        requestHeaders.set("x-agent-role", agentData.role);
        requestHeaders.set("x-agent-name", agentData.name);
        requestHeaders.set("x-agent-email", agentData.email);
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    }

    // No valid session cookie — pass through (validateApiKey handles x-api-key check)
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Protect customer portal routes
  if (pathname.startsWith("/portal/dashboard") || pathname.startsWith("/portal/submit")) {
    const token = request.cookies.get("customer_session")?.value;
    if (!token || !(await verifySessionToken(token))) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*", "/portal/dashboard/:path*", "/portal/submit/:path*"],
};
