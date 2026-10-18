import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { hashtagPattern } from "../lib/hashtags";

async function main() {
try {
  const rows = await prisma.$queryRaw<{ tag: string; count: number }[]>`
    SELECT tag, count(*)::int AS count FROM (
      SELECT DISTINCT p.id, lower(tags[1]) AS tag
      FROM (VALUES (1, '#Buku #buku #bukubaru'), (2, 'Baca (#BUKU)! foo#ignored ##ignored #sastra_indonesia')) AS p(id, content)
      CROSS JOIN LATERAL regexp_matches(p.content, ${hashtagPattern}, 'g') AS tags
    ) AS mentions GROUP BY tag ORDER BY count DESC, tag ASC
  `;
  assert.deepEqual(rows, [{ tag: "buku", count: 2 }, { tag: "bukubaru", count: 1 }, { tag: "sastra_indonesia", count: 1 }]);
  console.log("Hashtag extraction: case folding, per-post deduplication, exact boundaries passed");
} finally {
  await prisma.$disconnect();
}
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
