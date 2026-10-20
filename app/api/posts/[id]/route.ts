import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { imagekit } from "@/lib/imagekit";

const updateSchema = z.object({
  content: z.string().min(1).max(3000).optional(),
  bookTitle: z.string().max(200).optional().nullable(),
  bookAuthor: z.string().max(200).optional().nullable(),
  isSpoiler: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const currentUserId = session?.user.id ?? "__no_user__";
  const post = await prisma.post.findFirst({
    where: { id, isTakenDown: false, author: { isBanned: false } },
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
      reactions: { where: { userId: currentUserId }, select: { type: true } },
      bookmarks: { where: { userId: currentUserId }, select: { id: true } },
    },
  });
  if (!post || post.isTakenDown) {
    return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
  }
  const { reactions, bookmarks, ...data } = post;
  return NextResponse.json({ post: { ...data, myReaction: reactions[0]?.type ?? null, isBookmarked: bookmarks.length > 0 } }, { headers: { "Cache-Control": "private, no-store" } });
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
  if (!session?.user?.id) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });

  const isOwner = post.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const asset = post.imageFileId && post.imageUrl ? await prisma.postImage.findFirst({ where: { postId: id, ownerId: post.authorId, fileId: post.imageFileId, url: post.imageUrl } }) : null;
  await prisma.$transaction(async (tx) => {
    if (asset) await tx.postImage.update({ where: { fileId: asset.fileId }, data: { pendingDelete: true } });
    await tx.post.delete({ where: { id } });
  });
  if (asset) {
    try {
      await imagekit.deleteFile(asset.fileId);
      await prisma.postImage.delete({ where: { fileId: asset.fileId } });
    } catch (error) {
      console.error("Gagal menghapus gambar post dari ImageKit; pendingDelete tersimpan", asset.fileId, error);
    }
  }

  return NextResponse.json({ message: "Post dihapus" });
}
