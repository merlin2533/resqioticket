import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes except /admin/login
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = request.cookies.get("admin_session")?.value;
    const apiKey = process.env.API_KEY;

    if (!session || !apiKey || session !== apiKey) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
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
  matcher: ["/admin/:path*", "/portal/dashboard/:path*", "/portal/submit/:path*"],
};
