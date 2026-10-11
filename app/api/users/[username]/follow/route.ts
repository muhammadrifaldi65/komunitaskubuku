import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.following !== "boolean") {
    return NextResponse.json({ error: "Status mengikuti harus berupa boolean" }, { status: 400 });
  }
  const following: boolean = body.following;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize changes to this profile so returned counts match the committed follow state.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "username" = ${username} FOR NO KEY UPDATE`;
      const target = await tx.user.findUnique({ where: { username }, select: { id: true, isBanned: true } });
      if (!target || target.isBanned) return { error: "Pengguna tidak ditemukan", status: 404 };
      const actor = await tx.user.findUnique({
        where: { id: session.user.id }, select: { id: true, username: true, isBanned: true },
      });
      if (!actor) return { error: "Sesi tidak berlaku. Silakan login kembali", status: 401 };
      if (actor.isBanned) return { error: "Akun tidak dapat mengikuti pengguna", status: 403 };
      if (target.id === actor.id) return { error: "Tidak bisa mengikuti diri sendiri", status: 400 };

      const pair = { followerId: actor.id, followingId: target.id };
      if (following) {
        const inserted = await tx.follow.createMany({ data: [pair], skipDuplicates: true });
        if (inserted.count) {
          await tx.notification.create({
            data: {
              recipientId: target.id, actorId: actor.id, type: "FOLLOW",
              message: "mulai mengikuti kamu", link: `/profile/${encodeURIComponent(actor.username)}`,
            },
          });
        }
      } else {
        await tx.follow.deleteMany({ where: pair });
      }
      const followersCount = await tx.follow.count({
        where: { followingId: target.id, follower: { isBanned: false } },
      });
      return { following, followersCount };
    }, { maxWait: 15_000, timeout: 15_000 });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update follow state", error);
    return NextResponse.json({ error: "Gagal menyimpan status mengikuti. Silakan coba lagi" }, { status: 500 });
  }
}
