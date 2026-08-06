import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  if (target.id === session.user.id) {
    return NextResponse.json({ error: "Tidak bisa mengikuti diri sendiri" }, { status: 400 });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({
    data: { followerId: session.user.id, followingId: target.id },
  });
  await prisma.notification.create({
    data: {
      recipientId: target.id,
      actorId: session.user.id,
      type: "FOLLOW",
      message: "mulai mengikuti kamu",
      link: `/profile/${session.user.username}`,
    },
  });

  return NextResponse.json({ following: true });
}
