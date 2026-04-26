import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/games", req.url));
    }
    if (pathname.startsWith("/api/admin") && role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Laisse passer les requêtes API avec un token Bearer mobile
        const auth = req.headers.get("authorization");
        if (auth?.startsWith("Bearer ")) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/games/:path*",
    "/loans/:path*",
    "/admin/:path*",
    "/api/games/:path*",
    "/api/loans/:path*",
    "/api/admin/:path*",
    "/api/bgg/:path*",
  ],
};
