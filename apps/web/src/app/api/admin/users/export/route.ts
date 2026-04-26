import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { loans: true } },
      loans: { where: { returnedAt: null }, select: { id: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Utilisateurs");

  ws.columns = [
    { header: "Prénom", key: "firstName", width: 16 },
    { header: "Nom", key: "lastName", width: 16 },
    { header: "Email", key: "email", width: 28 },
    { header: "Matricule", key: "matricule", width: 14 },
    { header: "Rôle", key: "role", width: 10 },
    { header: "Suspendu", key: "suspended", width: 12 },
    { header: "Email vérifié", key: "emailVerified", width: 14 },
    { header: "Date d'inscription", key: "createdAt", width: 20 },
    { header: "Emprunts totaux", key: "totalLoans", width: 16 },
    { header: "Emprunts actifs", key: "activeLoans", width: 16 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8102E" } };
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const u of users) {
    ws.addRow({
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      email: u.email,
      matricule: u.matricule ?? "",
      role: u.role,
      suspended: u.suspended ? "Oui" : "Non",
      emailVerified: u.emailVerified ? "Oui" : "Non",
      createdAt: u.createdAt.toLocaleDateString("fr-FR"),
      totalLoans: u._count.loans,
      activeLoans: u.loans.length,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="utilisateurs-ludigest.xlsx"`,
    },
  });
}
