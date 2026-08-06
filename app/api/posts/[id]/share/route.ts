import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const session = await auth();

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.isTakenDown) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });

  await prisma.share.create({
    data: { postId, userId: session?.user.id },
  });
  const updated = await prisma.post.update({
    where: { id: postId },
    data: { shareCount: { increment: 1 } },
    select: { shareCount: true },
  });

  return NextResponse.json(updated);
}
