import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const { borrowedAt, dueAt } = body as { borrowedAt?: string; dueAt?: string };

  const parsedBorrowedAt = borrowedAt ? new Date(borrowedAt) : undefined;
  const parsedDueAt = dueAt ? new Date(dueAt) : undefined;

  if (parsedBorrowedAt && isNaN(parsedBorrowedAt.getTime())) {
    return NextResponse.json({ error: "Date d'emprunt invalide" }, { status: 400 });
  }
  if (parsedDueAt && isNaN(parsedDueAt.getTime())) {
    return NextResponse.json({ error: "Date d'échéance invalide" }, { status: 400 });
  }

  if (parsedBorrowedAt && parsedDueAt && parsedDueAt <= parsedBorrowedAt) {
    return NextResponse.json(
      { error: "La date d'échéance doit être postérieure à la date d'emprunt" },
      { status: 400 }
    );
  }

  const loan = await prisma.loan.findUnique({ where: { id: params.id } });
  if (!loan) {
    return NextResponse.json({ error: "Emprunt introuvable" }, { status: 404 });
  }

  // If only one date is provided, validate against the existing stored value
  if (parsedBorrowedAt && !parsedDueAt && parsedBorrowedAt >= loan.dueAt) {
    return NextResponse.json(
      { error: "La date d'emprunt doit être antérieure à la date d'échéance existante" },
      { status: 400 }
    );
  }
  if (parsedDueAt && !parsedBorrowedAt && parsedDueAt <= loan.borrowedAt) {
    return NextResponse.json(
      { error: "La date d'échéance doit être postérieure à la date d'emprunt existante" },
      { status: 400 }
    );
  }

  const updated = await prisma.loan.update({
    where: { id: params.id },
    data: {
      ...(parsedBorrowedAt && { borrowedAt: parsedBorrowedAt }),
      ...(parsedDueAt && { dueAt: parsedDueAt }),
    },
  });

  return NextResponse.json(updated);
}
