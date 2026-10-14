import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.bookmarked !== "boolean") {
    return NextResponse.json({ error: "Status markah harus berupa boolean" }, { status: 400 });
  }
  const bookmarked: boolean = body.bookmarked;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Keep visibility validation and writes together, including concurrent deletion.
      await tx.$queryRaw`SELECT "id" FROM "Post" WHERE "id" = ${postId} FOR NO KEY UPDATE`;
      const post = await tx.post.findFirst({
        where: { id: postId, isTakenDown: false, author: { isBanned: false } }, select: { id: true },
      });
      if (!post) return { error: "Post tidak ditemukan", status: 404 };
      const actor = await tx.user.findUnique({ where: { id: session.user.id }, select: { isBanned: true } });
      if (!actor) return { error: "Sesi tidak berlaku. Silakan login kembali", status: 401 };
      if (actor.isBanned) return { error: "Akun tidak dapat menyimpan markah", status: 403 };
      const pair = { userId: session.user.id, postId };
      if (bookmarked) await tx.bookmark.createMany({ data: [pair], skipDuplicates: true });
      else await tx.bookmark.deleteMany({ where: pair });
      return { bookmarked };
    }, { maxWait: 15_000, timeout: 15_000 });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update bookmark", error);
    return NextResponse.json({ error: "Gagal menyimpan markah. Silakan coba lagi" }, { status: 500 });
  }
}
