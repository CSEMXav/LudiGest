import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function splitName(user: { name: string; firstName: string | null; lastName: string | null }) {
  if (user.firstName || user.lastName) {
    return { firstName: user.firstName ?? "", lastName: user.lastName ?? "" };
  }
  const parts = user.name.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: "", lastName: user.name.trim() };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "session";
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const session = await prisma.gameSession.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, date: true },
  });
  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  const registrations = await prisma.gameSessionRegistration.findMany({
    where: { sessionId: session.id },
    include: { user: { select: { name: true, firstName: true, lastName: true, email: true } } },
    orderBy: { registeredAt: "asc" },
  });

  const header = ["Nom", "Prénom", "Email", "Nombre de personnes", "Accompagnant"];
  const rows = registrations.map((r) => {
    const { firstName, lastName } = splitName(r.user);
    const guest = r.guestName?.trim() ?? "";
    return [lastName, firstName, r.user.email, guest ? 2 : 1, guest];
  });

  // Tri par nom puis prénom (insensible à la casse et aux accents)
  const collator = new Intl.Collator("fr", { sensitivity: "base" });
  rows.sort((a, b) => collator.compare(String(a[0]), String(b[0])) || collator.compare(String(a[1]), String(b[1])));

  const totalPersons = rows.reduce((sum, r) => sum + Number(r[3]), 0);
  const lines = [
    header.map(csvCell).join(";"),
    ...rows.map((r) => r.map(csvCell).join(";")),
    "",
    [csvCell("Total"), csvCell(""), csvCell(""), csvCell(totalPersons), csvCell("")].join(";"),
  ];

  // BOM UTF-8 + séparateur ";" pour ouverture directe dans Excel (FR)
  const csv = "﻿" + lines.join("\r\n");
  const dateStr = session.date.toISOString().slice(0, 10);
  const filename = `inscrits-${slugify(session.name)}-${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
