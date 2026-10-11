import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      isBanned: true,
      _count: {
        select: {
          posts: { where: { isTakenDown: false } },
          followers: { where: { follower: { isBanned: false } } },
          following: { where: { following: { isBanned: false } } },
        },
      },
    },
  });

  if (!user || user.isBanned) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  const posts = await prisma.post.findMany({
    where: { authorId: user.id, isTakenDown: false },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      author: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
    },
  });

  let isFollowing = false;
  if (session?.user?.id) {
    const f = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
    });
    isFollowing = !!f;
  }

  return NextResponse.json({ user, posts, isFollowing });
}
