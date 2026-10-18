import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashtagPattern } from "@/lib/hashtags";

export async function GET() {
  try {
    const trends = await prisma.$queryRaw<{ tag: string; count: number }[]>`
      SELECT tag, count(*)::int AS count
      FROM (
        SELECT DISTINCT p.id, lower(tags[1]) AS tag
        FROM "Post" p
        JOIN "User" u ON u.id = p."authorId"
        CROSS JOIN LATERAL regexp_matches(p.content, ${hashtagPattern}, 'g') AS tags
        WHERE p."createdAt" >= now() - interval '24 hours'
          AND NOT p."isTakenDown" AND NOT u."isBanned"
      ) AS mentions
      GROUP BY tag
      ORDER BY count DESC, tag ASC
      LIMIT 10
    `;
    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Trending hashtags failed", error);
    return NextResponse.json({ error: "Hashtag trending belum dapat dimuat." }, { status: 503 });
  }
}
