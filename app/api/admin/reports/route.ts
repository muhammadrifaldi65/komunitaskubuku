import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session || !permissions.canViewReports(session.user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const reports = await prisma.report.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { username: true, name: true } },
      post: {
        include: { author: { select: { username: true, name: true } } },
      },
    },
  });

  return NextResponse.json({ reports });
}
