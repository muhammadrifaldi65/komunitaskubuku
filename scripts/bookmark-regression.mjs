// BOOKMARK_TEST_DISPOSABLE=1 BOOKMARK_TEST_COOKIE='account A cookie'
// BOOKMARK_TEST_OTHER_COOKIE='account B cookie' BOOKMARK_TEST_UNAVAILABLE_POST='taken-down or banned-author post ID'
// node scripts/bookmark-regression.mjs — creates 22 temporary posts; deletes them afterward.
import assert from "node:assert/strict";

const { BOOKMARK_TEST_COOKIE: cookie, BOOKMARK_TEST_OTHER_COOKIE: otherCookie, BOOKMARK_TEST_UNAVAILABLE_POST: unavailable } = process.env;
assert.equal(process.env.BOOKMARK_TEST_DISPOSABLE, "1", "Use disposable accounts only");
assert.ok(cookie && otherCookie && unavailable, "Provide both account cookies and an unavailable post ID");
const base = process.env.BOOKMARK_TEST_BASE_URL || "http://localhost:3000";
const ids = [];
async function request(path, options = {}) {
  const res = await fetch(new URL(path, base), { ...options, headers: { Cookie: cookie, "Content-Type": "application/json", ...options.headers } });
  return { status: res.status, body: await res.json() };
}
const put = (id, bookmarked, headers) => request(`/api/posts/${id}/bookmark`, { method: "PUT", body: JSON.stringify({ bookmarked }), headers });
try {
  assert.equal((await request("/api/bookmarks", { headers: { Cookie: "" } })).status, 401);
  assert.equal((await put(unavailable, true, { Cookie: "" })).status, 401);
  assert.equal((await put(unavailable, "true")).status, 400);
  assert.equal((await put(unavailable, true)).status, 404);
  assert.equal((await request(`/api/posts/${unavailable}`)).status, 404);
  assert.equal((await put(`missing-bookmark-${Date.now()}`, true)).status, 404);
  assert.equal((await request("/api/bookmarks?cursor=invalid")).status, 400);
  for (let i = 0; i < 22; i++) {
    const created = await request("/api/posts", { method: "POST", body: JSON.stringify({ content: `Bookmark regression ${Date.now()} ${i}` }) });
    assert.equal(created.status, 201);
    ids.push(created.body.post.id);
    assert.equal((await put(created.body.post.id, true)).status, 200);
  }
  const id = ids.at(-1);
  for (const result of await Promise.all(Array.from({ length: 8 }, () => put(id, true)))) {
    assert.equal(result.status, 200);
    assert.equal(result.body.bookmarked, true);
  }
  assert.equal((await request(`/api/posts/${id}`)).body.post.isBookmarked, true);
  const profile = await request(`/api/users/${encodeURIComponent((await request(`/api/posts/${id}`)).body.post.author.username)}`);
  assert.equal(profile.body.posts.find((post) => post.id === id).isBookmarked, true);
  const feed = await request("/api/posts?q=Bookmark%20regression");
  assert.equal(feed.body.posts.find((post) => post.id === id).isBookmarked, true);
  const first = await request("/api/bookmarks");
  assert.equal(first.status, 200);
  assert.equal(first.body.posts.length, 20);
  assert.deepEqual(first.body.posts.map((post) => post.id), ids.slice().reverse().slice(0, 20));
  assert.ok(first.body.nextCursor);
  // Removing the pagination boundary must not lose the next page.
  assert.equal((await put(first.body.posts.at(-1).id, false)).status, 200);
  const second = await request(`/api/bookmarks?${new URLSearchParams({ cursor: first.body.nextCursor })}`);
  assert.equal(second.status, 200);
  assert.deepEqual(second.body.posts.slice(0, 2).map((post) => post.id), ids.slice(0, 2).reverse());
  const other = await request("/api/bookmarks", { headers: { Cookie: otherCookie } });
  assert.equal(other.status, 200);
  assert.ok(!other.body.posts.some((post) => ids.includes(post.id)), "Bookmarks leaked across accounts");
  assert.equal((await request(`/api/posts/${id}`, { headers: { Cookie: otherCookie } })).body.post.isBookmarked, false);
  for (const result of await Promise.all(Array.from({ length: 8 }, () => put(id, false)))) {
    assert.equal(result.status, 200);
    assert.equal(result.body.bookmarked, false);
  }
  assert.equal((await request(`/api/posts/${id}`)).body.post.isBookmarked, false);
  assert.ok(!(await request("/api/bookmarks")).body.posts.some((post) => post.id === id || post.id === unavailable));
  console.log("Bookmark regression passed: persistence, idempotency, concurrency, privacy, pagination, visibility, serializers, input/auth guards.");
} finally {
  for (const id of ids) assert.equal((await request(`/api/posts/${id}`, { method: "DELETE" })).status, 200, `Cleanup failed for ${id}`);
}
