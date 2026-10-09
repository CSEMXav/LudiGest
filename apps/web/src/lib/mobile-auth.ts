import { jwtVerify, SignJWT } from "jose";
import { NextRequest } from "next/server";

interface MobileTokenPayload {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  location: string;
}

export async function verifyMobileToken(
  req: NextRequest
): Promise<MobileTokenPayload | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice(7);
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as MobileTokenPayload;
  } catch {
    return null;
  }
}

/** Durée de validité du jeton mobile. L'appli le renouvelle à chaque ouverture (voir /api/auth/mobile-token/refresh). */
export const MOBILE_TOKEN_TTL = "90d";

export async function signMobileToken(user: { id: string; email: string; name: string; role: string; location: string }): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
  return new SignJWT({ id: user.id, email: user.email, name: user.name, role: user.role, location: user.location })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(MOBILE_TOKEN_TTL)
    .sign(secret);
}

/**
 * Lit un jeton mobile en tolérant une expiration récente (pour le renouvellement uniquement) :
 * la signature doit rester valide, seul le délai d'expiration est assoupli.
 */
export async function verifyMobileTokenForRefresh(req: NextRequest): Promise<MobileTokenPayload | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const { payload } = await jwtVerify(auth.slice(7), secret, { clockTolerance: "90d" });
    return payload as unknown as MobileTokenPayload;
  } catch {
    return null;
  }
}
