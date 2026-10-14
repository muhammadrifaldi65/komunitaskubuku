import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  content: z.string().min(1).max(1000).refine((value) => value.trim().length > 0, "Komentar tidak boleh kosong"),
  parentId: z.string().min(1).max(191).refine((value) => value.trim() === value, "Balasan tidak valid").optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const post = await prisma.post.findFirst({
    where: { id: postId, isTakenDown: false, author: { isBanned: false } },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  const comments = await prisma.comment.findMany({
    where: { postId, post: { isTakenDown: false, author: { isBanned: false } } },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
    },
  });

  type CommentNode = (typeof comments)[number] & { replies: CommentNode[] };
  const map = new Map<string, CommentNode>();
  const root: CommentNode[] = [];

  comments.forEach((comment) => {
    map.set(comment.id, { ...comment, replies: [] });
  });

  comments.forEach((comment) => {
    const node = map.get(comment.id)!;
    if (comment.parentId) {
      const parent = map.get(comment.parentId);
      if (parent) {
        parent.replies.push(node);
      } else {
        root.push(node);
      }
    } else {
      root.push(node);
    }
  });

  return NextResponse.json({ comments: root });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Komentar atau tujuan balasan tidak valid (maksimal 1.000 karakter)" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findFirst({
        where: { id: postId, isTakenDown: false, author: { isBanned: false } },
        select: { authorId: true },
      });
      if (!post) return { error: "Post tidak ditemukan", status: 404 };
      const actor = await tx.user.findUnique({ where: { id: session.user.id }, select: { isBanned: true } });
      if (!actor) return { error: "Sesi tidak berlaku. Silakan login kembali", status: 401 };
      if (actor.isBanned) return { error: "Akun tidak dapat berkomentar", status: 403 };
      if (parsed.data.parentId) {
        const parent = await tx.comment.findFirst({
          where: { id: parsed.data.parentId, postId }, select: { id: true },
        });
        if (!parent) return { error: "Tujuan balasan tidak ditemukan pada postingan ini", status: 400 };
      }
      const comment = await tx.comment.create({
        data: {
          content: parsed.data.content,
          postId,
          authorId: session.user.id,
          parentId: parsed.data.parentId ?? undefined,
        },
        include: {
          author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
        },
      });
      await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
      if (post.authorId !== session.user.id) {
        await tx.notification.create({
          data: {
            recipientId: post.authorId,
            actorId: session.user.id,
            type: "COMMENT",
            message: "mengomentari postinganmu",
            link: `/post/${postId}`,
          },
        });
      }
      return { comment };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment", error);
    return NextResponse.json({ error: "Gagal menyimpan komentar. Silakan coba lagi" }, { status: 500 });
  }
}
