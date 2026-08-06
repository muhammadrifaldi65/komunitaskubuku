import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !permissions.canAccessAdminDashboard(session.user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "taken_down" | "active" | null(all)

  const posts = await prisma.post.findMany({
    where:
      status === "taken_down"
        ? { isTakenDown: true }
        : status === "active"
        ? { isTakenDown: false }
        : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
      _count: { select: { reports: true } },
    },
  });

  return NextResponse.json({ posts });
}
