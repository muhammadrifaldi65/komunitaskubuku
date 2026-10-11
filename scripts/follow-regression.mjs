// Run against two disposable accounts only: this creates follow notifications.
// FOLLOW_TEST_DISPOSABLE=1 FOLLOW_TEST_COOKIE='auth cookie' FOLLOW_TEST_ACTOR='reader-a'
// FOLLOW_TEST_TARGET='reader-b' node scripts/follow-regression.mjs
import assert from "node:assert/strict";

const { FOLLOW_TEST_COOKIE: cookie, FOLLOW_TEST_ACTOR: actor, FOLLOW_TEST_TARGET: target } = process.env;
assert.equal(process.env.FOLLOW_TEST_DISPOSABLE, "1", "Confirm both accounts are disposable with FOLLOW_TEST_DISPOSABLE=1");
assert.ok(cookie && actor && target, "Provide FOLLOW_TEST_COOKIE, FOLLOW_TEST_ACTOR, FOLLOW_TEST_TARGET");
assert.notEqual(actor, target, "Use two different disposable accounts");
const base = process.env.FOLLOW_TEST_BASE_URL || "http://localhost:3000";
const path = `/api/users/${encodeURIComponent(target)}`;
async function request(url, options = {}) {
  const res = await fetch(new URL(url, base), {
    ...options,
    headers: { Cookie: cookie, "Content-Type": "application/json", ...options.headers },
  });
  return { status: res.status, body: await res.json() };
}
const put = (following) => request(`${path}/follow`, { method: "PUT", body: JSON.stringify({ following }) });
const original = await request(path);
assert.equal(original.status, 200);
try {
  assert.equal((await request(`${path}/follow`, { method: "PUT", headers: { Cookie: "" }, body: '{"following":true}' })).status, 401);
  assert.equal((await request(`${path}/follow`, { method: "PUT", body: '{"following":"true"}' })).status, 400);
  assert.equal((await request(`/api/users/${encodeURIComponent(actor)}/follow`, { method: "PUT", body: '{"following":true}' })).status, 400);
  assert.equal((await request(`/api/users/__missing_follow_test_${Date.now()}/follow`, { method: "PUT", body: '{"following":true}' })).status, 404);
  const cleared = await put(false);
  assert.equal(cleared.status, 200);
  const baseline = cleared.body.followersCount;
  const followed = await Promise.all(Array.from({ length: 8 }, () => put(true)));
  for (const result of followed) {
    assert.equal(result.status, 200);
    assert.equal(result.body.following, true);
    assert.equal(result.body.followersCount, baseline + 1);
  }
  const profile = await request(path);
  assert.equal(profile.body.isFollowing, true);
  assert.equal(profile.body.user._count.followers, baseline + 1);
  async function members(username, kind) {
    const all = [];
    let cursor = null;
    do {
      const query = new URLSearchParams({ kind });
      if (cursor) query.set("after", cursor);
      const page = await request(`/api/users/${encodeURIComponent(username)}/connections?${query}`);
      assert.equal(page.status, 200);
      all.push(...page.body.members);
      cursor = page.body.nextCursor;
      if (!cursor) assert.equal(all.length, page.body.total);
    } while (cursor);
    assert.equal(new Set(all.map((member) => member.id)).size, all.length);
    return all;
  }
  assert.ok((await members(target, "followers")).some((member) => member.username === actor));
  assert.ok((await members(actor, "following")).some((member) => member.username === target));
  const unfollowed = await Promise.all(Array.from({ length: 8 }, () => put(false)));
  for (const result of unfollowed) {
    assert.equal(result.status, 200);
    assert.equal(result.body.following, false);
    assert.equal(result.body.followersCount, baseline);
  }
  assert.equal((await request(path)).body.isFollowing, false);
  assert.ok(!(await members(target, "followers")).some((member) => member.username === actor));
  console.log("Follow regression passed: idempotency, concurrency, counts, member lists, input/auth/self/missing-target guards.");
} finally {
  const restored = await put(original.body.isFollowing);
  assert.equal(restored.status, 200, "Could not restore disposable accounts' original follow state");
}
