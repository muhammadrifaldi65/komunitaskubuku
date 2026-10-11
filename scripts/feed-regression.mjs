// Run: node scripts/feed-regression.mjs (no server, credentials, or database writes).
// Contract: q is trimmed, <=100 characters; feed defaults to all, or authenticated following.
// Pagination consumes 20 chronological rows (createdAt/id descending), then ranks only that page.
// nextCursor is the chronological boundary, not the last displayed item; reset it when filters change.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(relative, dependencies = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function("exports", "require", outputText)(exports, (name) => dependencies[name] ?? require(name));
  return exports;
}
const algorithm = load("../lib/algorithm.ts");
let session = null;
let queries = 0;
const rows = Array.from({ length: 65 }, (_, index) => ({
  id: String(1000 - index),
  // Timestamp ties deliberately exercise the ID tie-breaker.
  createdAt: new Date(Date.now() - Math.floor(index / 3) * 3600000),
  authorId: index % 2 ? "followed" : "other",
  author: { isBanned: index === 3 },
  isTakenDown: index === 4,
  content: index === 8 ? "Content NEEDLE" : "ordinary post",
  bookTitle: index === 9 ? "Title NEEDLE" : null,
  bookAuthor: index === 10 ? "Author NEEDLE" : null,
  likeCount: index % 20 === 0 ? 100000 : 0,
  dislikeCount: 0, commentCount: 0, shareCount: 0,
  reactions: [], bookmarks: [],
}));
const prisma = {
  follow: { findMany: async (query) => {
    assert.equal(query.where.followerId, "reader");
    return [{ followingId: "followed" }];
  } },
  post: { findMany: async (query) => {
    queries++;
    assert.equal(query.where.isTakenDown, false);
    assert.equal(query.where.author.isBanned, false);
    assert.equal(JSON.stringify(query.orderBy), JSON.stringify([{ createdAt: "desc" }, { id: "desc" }]));
    assert.equal(query.take, 21);
    const following = query.where.author.followers;
    if (following) assert.equal(following.some.followerId, "reader");
    const search = query.where.OR;
    if (search) {
      assert.deepEqual(Array.from(search, (clause) => Object.keys(clause)[0]), ["content", "bookTitle", "bookAuthor"]);
      for (const clause of search) assert.equal(Object.values(clause)[0].mode, "insensitive");
    }
    let eligible = rows.filter((post) => !post.isTakenDown && !post.author.isBanned
      && (!following || post.authorId === "followed")
      && (!search || search.some((clause) => {
        const [field, condition] = Object.entries(clause)[0];
        return (post[field] ?? "").toLowerCase().includes(condition.contains.toLowerCase());
      })));
    if (query.cursor) {
      assert.equal(query.skip, 1);
      eligible = eligible.slice(eligible.findIndex((post) => post.id === query.cursor.id) + 1);
    }
    return eligible.slice(0, query.take);
  } },
};
const { GET } = load("../app/api/posts/route.ts", {
  "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
  "@/auth": { auth: async () => session }, "@/lib/prisma": { prisma }, "@/lib/algorithm": algorithm,
});
const get = (params = {}) => GET(new Request(`http://localhost/api/posts?${new URLSearchParams(params)}`));
assert.equal((await get({ feed: "invalid" })).status, 400);
assert.equal((await get({ q: "x".repeat(101) })).status, 400);
assert.equal((await get({ feed: "following" })).status, 401);
assert.equal(queries, 0, "Invalid/anonymous requests must not query posts");
assert.equal((await get({ q: `  ${"x".repeat(100)}  ` })).status, 200);
const searched = await get({ q: "  nEeDlE  " });
assert.deepEqual(searched.body.posts.map((post) => post.id).sort(), ["990", "991", "992"]);
assert.equal(searched.body.nextCursor, null);
assert.equal((await get({ q: "no match" })).body.posts.length, 0);
async function traverse(params, expected) {
  const ids = [];
  let cursor;
  do {
    const response = await get({ ...params, ...(cursor ? { cursor } : {}) });
    assert.equal(response.status, 200);
    const page = response.body.posts;
    const chronological = expected.slice(ids.length, ids.length + 20);
    assert.deepEqual(page.map((post) => post.id).sort(), chronological.map((post) => post.id).sort());
    assert.deepEqual(page.map((post) => post.id), algorithm.rankPosts(chronological, new Set(session ? ["followed"] : [])).map((post) => post.id));
    for (const post of page) {
      assert.equal(post.myReaction, null);
      assert.equal(post.isBookmarked, false);
      assert.equal(post.reactions, undefined);
      assert.equal(post.bookmarks, undefined);
    }
    ids.push(...page.map((post) => post.id));
    cursor = response.body.nextCursor;
    assert.equal(cursor, ids.length < expected.length ? chronological.at(-1).id : null);
    assert.ok(ids.length <= expected.length, "Pagination must terminate");
  } while (cursor);
  assert.equal(new Set(ids).size, expected.length, "Every eligible post appears exactly once");
}
const visible = rows.filter((post) => !post.isTakenDown && !post.author.isBanned);
await traverse({}, visible);
session = { user: { id: "reader" } };
await traverse({ feed: "all", q: "   " }, visible);
await traverse({ feed: "following" }, visible.filter((post) => post.authorId === "followed"));
await traverse({ feed: "following", q: "needle" }, visible.filter((post) => post.authorId === "followed" && post.bookTitle));
rows.splice(22); // Two hidden rows leave exactly one full page: nextCursor must be null.
await traverse({}, rows.filter((post) => !post.isTakenDown && !post.author.isBanned));
console.log("Feed regression passed: validation, auth, search fields, visibility, following, ranking, complete stable pagination.");
