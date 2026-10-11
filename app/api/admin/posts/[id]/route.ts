import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || !permissions.canDeletePost(session.user.role)) {
    return NextResponse.json({ error: "Hanya Admin yang bisa menghapus postingan" }, { status: 403 });
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });

  await prisma.post.delete({ where: { id } });
  // Client-supplied imageFileId cannot establish ownership; retain remote media.

  return NextResponse.json({ message: "Postingan dihapus" });
}
