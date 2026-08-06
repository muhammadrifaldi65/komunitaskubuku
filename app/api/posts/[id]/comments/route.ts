import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
    },
  });

  const map = new Map<string, (typeof comments)[number] & { replies: any[] }>();
  const root: Array<(typeof comments)[number] & { replies: any[] }> = [];

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
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.isTakenDown) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });

  const comment = await prisma.comment.create({
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

  await prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });

  if (post.authorId !== session.user.id) {
    await prisma.notification.create({
      data: {
        recipientId: post.authorId,
        actorId: session.user.id,
        type: "COMMENT",
        message: "mengomentari postinganmu",
        link: `/post/${postId}`,
      },
    });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
