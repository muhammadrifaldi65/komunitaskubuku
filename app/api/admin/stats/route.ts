import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session || !permissions.canAccessAdminDashboard(session.user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const [totalUsers, bannedUsers, totalPosts, takenDownPosts, pendingReports, openThreads] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.post.count(),
    prisma.post.count({ where: { isTakenDown: true } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.chatThread.count({ where: { isOpen: true } }),
  ]);

  return NextResponse.json({
    totalUsers,
    bannedUsers,
    totalPosts,
    takenDownPosts,
    pendingReports,
    openThreads,
  });
}
