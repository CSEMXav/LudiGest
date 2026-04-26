import { jwtVerify } from "jose";
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
