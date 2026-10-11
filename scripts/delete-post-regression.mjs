// Disposable accounts only: creates then permanently deletes test posts.
// DELETE_TEST_DISPOSABLE=1 DELETE_TEST_OWNER_COOKIE='session cookie'
// DELETE_TEST_OTHER_COOKIE='different non-admin session cookie' node scripts/delete-post-regression.mjs
// Optional DELETE_TEST_ADMIN_COOKIE exercises admin deletion of another user's post.
import assert from "node:assert/strict";

assert.equal(process.env.DELETE_TEST_DISPOSABLE, "1", "Confirm disposable accounts with DELETE_TEST_DISPOSABLE=1");
const owner = process.env.DELETE_TEST_OWNER_COOKIE;
const other = process.env.DELETE_TEST_OTHER_COOKIE;
const admin = process.env.DELETE_TEST_ADMIN_COOKIE;
assert.ok(owner && other, "Provide DELETE_TEST_OWNER_COOKIE and DELETE_TEST_OTHER_COOKIE");
const base = process.env.DELETE_TEST_BASE_URL || "http://localhost:3000";
async function request(path, cookie = owner, options = {}) {
  const response = await fetch(new URL(path, base), {
    ...options, headers: { "Content-Type": "application/json", Cookie: cookie },
  });
  return { status: response.status, body: await response.json() };
}
const ownerSession = await request("/api/auth/session");
const otherSession = await request("/api/auth/session", other);
assert.ok(ownerSession.body.user?.id, "Owner session must be authenticated");
assert.ok(otherSession.body.user?.id, "Other session must be authenticated");
assert.notEqual(ownerSession.body.user.id, otherSession.body.user.id);
assert.notEqual(otherSession.body.user.role, "ADMIN", "Nonowner must not be an administrator");
const profilePath = `/api/users/${encodeURIComponent(ownerSession.body.user.username)}`;
const baseline = await request(profilePath);
assert.equal(baseline.status, 200);
const created = await request("/api/posts", owner, {
  method: "POST", body: JSON.stringify({ content: `Deletion regression ${Date.now()}` }),
});
assert.equal(created.status, 201);
const path = `/api/posts/${created.body.post.id}`;
try {
  assert.equal((await request(path, "", { method: "DELETE" })).status, 401);
  assert.equal((await request(path, "authjs.session-token=invalid", { method: "DELETE" })).status, 401);
  assert.equal((await request(path, other, { method: "DELETE" })).status, 403);
  assert.equal((await request(path)).status, 200, "Denied deletion must preserve post");
  assert.equal((await request(profilePath)).body.user._count.posts, baseline.body.user._count.posts + 1);
  assert.equal((await request(path, owner, { method: "DELETE" })).status, 200);
  assert.equal((await request(path)).status, 404);
  assert.equal((await request(path, owner, { method: "DELETE" })).status, 404);
  const profile = await request(profilePath);
  assert.equal(profile.body.user._count.posts, baseline.body.user._count.posts);
  assert.ok(!profile.body.posts.some((post) => post.id === created.body.post.id));
} finally {
  const cleanup = await request(path, owner, { method: "DELETE" });
  assert.ok([200, 404].includes(cleanup.status), "Could not remove disposable test post");
}
if (admin) {
  const adminSession = await request("/api/auth/session", admin);
  assert.equal(adminSession.body.user?.role, "ADMIN");
  assert.notEqual(adminSession.body.user.id, ownerSession.body.user.id);
  const another = await request("/api/posts", owner, { method: "POST", body: JSON.stringify({ content: "Admin deletion regression" }) });
  assert.equal(another.status, 201);
  const adminPath = `/api/posts/${another.body.post.id}`;
  try {
    assert.equal((await request(adminPath, admin, { method: "DELETE" })).status, 200);
    assert.equal((await request(adminPath)).status, 404);
  } finally {
    assert.ok([200, 404].includes((await request(adminPath, owner, { method: "DELETE" })).status));
  }
}
console.log("Deletion regression passed: anonymous/invalid auth, nonowner denial, owner success, missing post, profile count/removal; optional admin.");
