import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id: postId, commentId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const comment = await tx.comment.findFirst({ where: { id: commentId, postId }, select: { authorId: true } });
      if (!comment) return { status: 404, error: "Komentar tidak ditemukan" };
      if (comment.authorId !== session.user.id && session.user.role !== "ADMIN") {
        return { status: 403, error: "Tidak diizinkan" };
      }

      // Parent relation uses NoAction: collect whole subtree, then delete leaves before parents.
      const ids = [commentId];
      for (let start = 0; start < ids.length;) {
        const parents = ids.slice(start);
        start = ids.length;
        const children = await tx.comment.findMany({ where: { postId, parentId: { in: parents } }, select: { id: true } });
        ids.push(...children.map((child) => child.id));
      }
      for (const id of ids.reverse()) await tx.comment.delete({ where: { id } });
      await tx.post.update({ where: { id: postId }, data: { commentCount: { decrement: ids.length } } });
      return { status: 200 };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete comment", error);
    return NextResponse.json({ error: "Gagal menghapus komentar. Coba lagi" }, { status: 500 });
  }
}
