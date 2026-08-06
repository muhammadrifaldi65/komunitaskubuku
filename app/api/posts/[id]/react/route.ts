import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ type: z.enum(["LIKE", "DISLIKE"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Tipe reaksi tidak valid" }, { status: 400 });
  const { type } = parsed.data;

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.isTakenDown) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });

  const existing = await prisma.reaction.findUnique({
    where: { userId_postId: { userId: session.user.id, postId } },
  });

  let likeDelta = 0;
  let dislikeDelta = 0;

  if (!existing) {
    await prisma.reaction.create({ data: { userId: session.user.id, postId, type } });
    if (type === "LIKE") likeDelta = 1;
    else dislikeDelta = 1;

    if (type === "LIKE" && post.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: session.user.id,
          type: "LIKE",
          message: "menyukai postinganmu",
          link: `/post/${postId}`,
        },
      });
    }
  } else if (existing.type === type) {
    // batal reaksi (toggle off)
    await prisma.reaction.delete({ where: { id: existing.id } });
    if (type === "LIKE") likeDelta = -1;
    else dislikeDelta = -1;
  } else {
    // ganti dari like ke dislike atau sebaliknya
    await prisma.reaction.update({ where: { id: existing.id }, data: { type } });
    if (type === "LIKE") {
      likeDelta = 1;
      dislikeDelta = -1;
    } else {
      likeDelta = -1;
      dislikeDelta = 1;
    }
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      likeCount: { increment: likeDelta },
      dislikeCount: { increment: dislikeDelta },
    },
    select: { likeCount: true, dislikeCount: true },
  });

  const myReaction = existing && existing.type === type ? null : type;

  return NextResponse.json({ ...updated, myReaction });
}
