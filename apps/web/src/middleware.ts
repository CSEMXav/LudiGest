import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisse passer les requêtes API avec un token Bearer mobile
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return NextResponse.next();

  const token = await getToken({ req });

  if (!token) {
    // Utilise x-forwarded-host pour reconstruire l'URL avec le vrai domaine
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "www.ludigest.fr";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${proto}://${host}`;

    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("callbackUrl", `${baseUrl}${pathname}`);
    return NextResponse.redirect(loginUrl);
  }

  // Restriction admin
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/games", req.url));
  }
  if (pathname.startsWith("/api/admin") && token.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  return NextResponse.next();
}

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
