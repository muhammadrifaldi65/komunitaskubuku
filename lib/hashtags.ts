import { Prisma } from "@/generated/prisma/client";

// PostgreSQL character classes keep extraction and exact hashtag search consistent.
export const hashtagPattern = "(?:^|[^[:alnum:]_#])#([[:alnum:]_]{1,64})(?![[:alnum:]_])";

export function hashtagMatches(tag: string) {
  return Prisma.sql`SELECT p.id FROM "Post" p
    WHERE EXISTS (
      SELECT 1 FROM regexp_matches(p.content, ${hashtagPattern}, 'g') AS tags
      WHERE lower(tags[1]) = lower(${tag})
    )`;
}
