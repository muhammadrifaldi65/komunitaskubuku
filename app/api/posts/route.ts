import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rankPosts } from "@/lib/algorithm";
const imageUrlSchema = z.string().refine((value) => {
  if (value.startsWith("/media/")) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}, "URL gambar tidak valid");

const createSchema = z.object({
  content: z.string().min(1).max(3000),
  imageUrl: imageUrlSchema.optional().nullable(),
  imageFileId: z.string().optional().nullable(),
  bookTitle: z.string().max(200).optional().nullable(),
  bookAuthor: z.string().max(200).optional().nullable(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const feed = searchParams.get("feed") ?? "all";
  if (q.length > 100 || (feed !== "all" && feed !== "following")) {
    return NextResponse.json({ error: "Pencarian maksimal 100 karakter; feed harus all atau following" }, { status: 400 });
  }
  const cursor = searchParams.get("cursor") ?? undefined;
  const take = 20;

  const session = await auth();
  if (feed === "following" && !session) {
    return NextResponse.json({ error: "Harus login" }, { status: 401 });
  }
  const currentUserId = session?.user.id ?? "__no_user__";

  const posts = await prisma.post.findMany({
    where: {
      isTakenDown: false,
      author: {
        isBanned: false,
        ...(feed === "following" ? { followers: { some: { followerId: currentUserId } } } : {}),
      },
      ...(q ? {
        OR: [
          { content: { contains: q, mode: "insensitive" as const } },
          { bookTitle: { contains: q, mode: "insensitive" as const } },
          { bookAuthor: { contains: q, mode: "insensitive" as const } },
        ],
      } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
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

  // Consume chronological pages before ranking; never use a ranked item's position as the boundary.
  // The extra row signals another page without skipping it. IDs break equal-timestamp ties.
  const page = posts.slice(0, take);
  const nextCursor = posts.length > take ? page[page.length - 1].id : null;
  const ranked = rankPosts(page, followedIds);

  const result = ranked.map((p: (typeof posts)[number]) => ({
    ...p,
    myReaction: p.reactions?.[0]?.type ?? null,
    isBookmarked: (p.bookmarks?.length ?? 0) > 0,
    reactions: undefined,
    bookmarks: undefined,
  }));

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
