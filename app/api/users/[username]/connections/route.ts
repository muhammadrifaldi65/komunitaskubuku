import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const search = new URL(req.url).searchParams;
  const kind = search.get("kind");
  const after = search.get("after");
  if (kind !== "followers" && kind !== "following") {
    return NextResponse.json({ error: "Jenis daftar tidak valid" }, { status: 400 });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { username }, select: { id: true, isBanned: true } });
      if (!target || target.isBanned) return null;
      const where = {
        isBanned: false,
        ...(kind === "followers"
          ? { following: { some: { followingId: target.id } } }
          : { followers: { some: { followerId: target.id } } }),
      };
      const members = await tx.user.findMany({
        where: { ...where, ...(after ? { id: { gt: after } } : {}) },
        orderBy: { id: "asc" }, take: 31,
        select: { id: true, username: true, name: true, avatarUrl: true, bio: true },
      });
      const total = await tx.user.count({ where });
      const hasMore = members.length > 30;
      if (hasMore) members.pop();
      return { members, total, nextCursor: hasMore ? members[members.length - 1].id : null };
    }, { isolationLevel: "RepeatableRead", maxWait: 15_000, timeout: 15_000 });
    if (!result) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to load profile connections", error);
    return NextResponse.json({ error: "Daftar anggota belum dapat dimuat" }, { status: 500 });
  }
}
