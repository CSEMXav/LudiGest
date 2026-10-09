import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderProposalsOpenEmail, sendProposalsOpenEmail } from "@/lib/email";
import { getProposalWindow } from "@/lib/proposals";

export const maxDuration = 60;

type Mode = "preview" | "test" | "send";

/**
 * POST /api/proposals/announce — admin : email informant les membres de la ludothèque courante
 * qu'ils peuvent proposer et voter jusqu'à la fermeture.
 * body: { mode: "preview" | "test" | "send" }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user;
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const mode: Mode = body.mode === "test" || body.mode === "send" ? body.mode : "preview";

  const window = await getProposalWindow(admin.location);
  if (!window.isOpen) {
    return NextResponse.json(
      { error: "La page n'est pas ouverte aux membres actuellement : enregistrez d'abord une période d'ouverture en cours." },
      { status: 409 }
    );
  }

  const adminUser = await prisma.user.findUnique({ where: { id: admin.id }, select: { email: true, name: true, firstName: true } });
  const adminName = adminUser?.firstName ?? adminUser?.name ?? "Admin";
  // Les membres déjà prévenus pour cette période d'ouverture ne reçoivent pas l'email une seconde fois :
  // relancer l'envoi ne touche que ceux qui ne l'ont pas encore eu.
  const recipientWhere = {
    suspended: false,
    emailVerified: true,
    location: admin.location,
    notifications: { none: { type: "PROPOSALS_OPEN", createdAt: { gte: window.opensAt ?? undefined } } },
  };

  if (mode === "preview") {
    const [recipients, total] = await Promise.all([
      prisma.user.count({ where: recipientWhere }),
      prisma.user.count({ where: { suspended: false, emailVerified: true, location: admin.location } }),
    ]);
    return NextResponse.json({
      ...renderProposalsOpenEmail({ userName: adminName, closesAt: window.closesAt }),
      recipients,
      alreadyNotified: total - recipients,
    });
  }

  if (mode === "test") {
    if (!adminUser?.email) return NextResponse.json({ error: "Email admin introuvable." }, { status: 400 });
    await sendProposalsOpenEmail(adminUser.email, { userName: adminName, closesAt: window.closesAt });
    return NextResponse.json({ success: true, sentTo: adminUser.email });
  }

  const users = await prisma.user.findMany({
    where: recipientWhere,
    select: { id: true, email: true, name: true, firstName: true },
  });

  let emailsSent = 0;
  // Envoi par lots pour ne pas saturer l'API email
  const BATCH = 20;
  for (let i = 0; i < users.length; i += BATCH) {
    await Promise.all(users.slice(i, i + BATCH).map(async (user) => {
      try {
        await sendProposalsOpenEmail(user.email, { userName: user.firstName ?? user.name, closesAt: window.closesAt });
        emailsSent++;
        // Trace pour le journal d'envoi
        await prisma.userNotification.create({
          data: { userId: user.id, type: "PROPOSALS_OPEN", title: "🛒 Futurs achats : proposez et votez", message: "Vous pouvez proposer des jeux et voter pour les futurs achats de la ludothèque." },
        }).catch(() => {});
      } catch (err) {
        console.error(`Failed to send proposals email to ${user.email}:`, err);
      }
    }));
  }

  return NextResponse.json({ success: true, emailsSent, failed: users.length - emailsSent, recipients: users.length });
}
