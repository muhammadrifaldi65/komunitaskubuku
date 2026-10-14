import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Harus login" }, { status: 401 });
  const cursor = new URL(req.url).searchParams.get("cursor");
  let boundary: { createdAt: Date; id: string } | undefined;
  if (cursor !== null) {
    try {
      const value = JSON.parse(cursor);
      if (!value || typeof value.createdAt !== "string" || typeof value.id !== "string" || !value.id || value.id.length > 100) throw new Error("Invalid cursor");
      const createdAt = new Date(value.createdAt);
      if (!Number.isFinite(createdAt.getTime())) throw new Error("Invalid date");
      boundary = { createdAt, id: value.id };
    } catch {
      return NextResponse.json({ error: "Penanda halaman tidak valid" }, { status: 400 });
    }
  }
  try {
    const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isBanned: true } });
    if (!actor) return NextResponse.json({ error: "Sesi tidak berlaku. Silakan login kembali" }, { status: 401 });
    if (actor.isBanned) return NextResponse.json({ error: "Akun tidak dapat membuka markah" }, { status: 403 });
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: session.user.id,
        post: { isTakenDown: false, author: { isBanned: false } },
        ...(boundary ? { OR: [
          { createdAt: { lt: boundary.createdAt } },
          { createdAt: boundary.createdAt, id: { lt: boundary.id } },
        ] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 21,
      include: { post: { include: {
        author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
        reactions: { where: { userId: session.user.id }, select: { type: true } },
      } } },
    });
    const page = bookmarks.slice(0, 20);
    const last = page.at(-1);
    return NextResponse.json({
      posts: page.map(({ post: { reactions, ...post } }) => ({ ...post, myReaction: reactions[0]?.type ?? null, isBookmarked: true })),
      nextCursor: bookmarks.length > 20 && last ? JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id }) : null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load bookmarks", error);
    return NextResponse.json({ error: "Gagal memuat markah. Silakan coba lagi" }, { status: 500 });
  }
}
