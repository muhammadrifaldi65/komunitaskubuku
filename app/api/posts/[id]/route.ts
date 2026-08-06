import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteImage } from "@/lib/imagekit";

const updateSchema = z.object({
  content: z.string().min(1).max(3000).optional(),
  bookTitle: z.string().max(200).optional().nullable(),
  bookAuthor: z.string().max(200).optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
    },
  });
  if (!post || post.isTakenDown) {
    return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  if (post.authorId !== session.user.id) {
    return NextResponse.json({ error: "Kamu hanya bisa mengedit postingan sendiri" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.post.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ post: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });

  const isOwner = post.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  if (post.imageFileId) {
    await deleteImage(post.imageFileId);
  }
  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ message: "Post dihapus" });
}
