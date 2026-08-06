import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rankPosts } from "@/lib/algorithm";

const createSchema = z.object({
  content: z.string().min(1).max(3000),
  imageUrl: z.string().url().optional().nullable(),
  imageFileId: z.string().optional().nullable(),
  bookTitle: z.string().max(200).optional().nullable(),
  bookAuthor: z.string().max(200).optional().nullable(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const take = 20;

  const session = await auth();
  const currentUserId = session?.user.id ?? "__no_user__";

  const posts = await prisma.post.findMany({
    where: { isTakenDown: false },
    orderBy: { createdAt: "desc" },
    take: 100, // ambil kumpulan lebih besar lalu di-rank, baru dipaginasi
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
      reactions: { where: { userId: currentUserId }, select: { type: true } },
      bookmarks: { where: { userId: currentUserId }, select: { id: true } },
    },
  });

  let followedIds = new Set<string>();
  if (session) {
    const follows = await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    });
    followedIds = new Set(follows.map((f: { followingId: string }) => f.followingId));
  }

  const ranked = rankPosts(posts, followedIds).slice(0, take);

  const result = ranked.map((p: (typeof posts)[number]) => ({
    ...p,
    myReaction: p.reactions?.[0]?.type ?? null,
    isBookmarked: (p.bookmarks?.length ?? 0) > 0,
    reactions: undefined,
    bookmarks: undefined,
  }));

  const nextCursor = ranked.length === take ? ranked[ranked.length - 1].id : null;

  return NextResponse.json({ posts: result, nextCursor });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      content: parsed.data.content,
      imageUrl: parsed.data.imageUrl ?? undefined,
      imageFileId: parsed.data.imageFileId ?? undefined,
      bookTitle: parsed.data.bookTitle ?? undefined,
      bookAuthor: parsed.data.bookAuthor ?? undefined,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
