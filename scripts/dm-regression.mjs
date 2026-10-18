// Disposable accounts only: persists messages, restores follow states.
// DM_TEST_DISPOSABLE=1 DM_TEST_A=a DM_TEST_B=b DM_TEST_COOKIE_A=... DM_TEST_COOKIE_B=... DM_TEST_COOKIE_C=... node scripts/dm-regression.mjs
import assert from "node:assert/strict";
const e = process.env;
assert.equal(e.DM_TEST_DISPOSABLE, "1");
for (const key of ["A", "B", "COOKIE_A", "COOKIE_B", "COOKIE_C"]) assert.ok(e[`DM_TEST_${key}`], `Missing DM_TEST_${key}`);
assert.notEqual(e.DM_TEST_A, e.DM_TEST_B);
async function request(who, path, method = "GET", body) {
  const res = await fetch(new URL(path, e.DM_TEST_BASE_URL || "http://localhost:3000"), {
    method, headers: { Cookie: e[`DM_TEST_COOKIE_${who}`] || "", "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: await res.json() };
}
const profile = (name) => `/api/users/${encodeURIComponent(name)}`;
const follow = (who, name, following) => request(who, `${profile(name)}/follow`, "PUT", { following });
const send = (who, username, content = `dm-regression-${Date.now()}`) => request(who, "/api/dm", "POST", { username, content });
const originalA = await request("A", profile(e.DM_TEST_B));
const originalB = await request("B", profile(e.DM_TEST_A));
assert.equal(originalA.status, 200); assert.equal(originalB.status, 200);
try {
  assert.equal((await request("NONE", "/api/dm")).status, 401);
  assert.equal((await follow("A", e.DM_TEST_B, true)).status, 200);
  assert.equal((await follow("B", e.DM_TEST_A, false)).status, 200);
  assert.equal((await send("A", e.DM_TEST_B)).status, 403, "Sender following recipient is insufficient");
  const sent = await send("B", e.DM_TEST_A);
  assert.equal(sent.status, 201);
  const id = sent.body.message.threadId;
  assert.equal((await request("C", `/api/dm/${id}`)).status, 404);
  assert.equal((await request("C", `/api/dm/${id}`, "PATCH", { messageId: sent.body.message.id })).status, 404);
  assert.ok(!(await request("C", "/api/dm")).body.threads.some((t) => t.id === id));
  const persisted = await request("A", `/api/dm/${id}`);
  assert.ok(persisted.body.messages.some((m) => m.id === sent.body.message.id));
  assert.ok((await request("A", "/api/dm")).body.threads.find((t) => t.id === id).unreadCount > 0);
  assert.equal((await request("A", `/api/dm/${id}`, "PATCH", { messageId: sent.body.message.id })).status, 200);
  assert.equal((await request("B", `/api/dm/${id}`)).body.messages.find((m) => m.id === sent.body.message.id).readAt !== null, true);
  assert.equal((await follow("A", e.DM_TEST_B, false)).status, 200);
  assert.equal((await send("B", e.DM_TEST_A)).status, 403, "Unfollow must deny existing conversation sends");
  assert.ok((await request("B", `/api/dm/${id}`)).body.messages.some((m) => m.id === sent.body.message.id));
  assert.equal((await send("A", e.DM_TEST_A)).status, 400);
  assert.equal((await send("A", e.DM_TEST_B, " ")).status, 400);
  assert.equal((await send("A", e.DM_TEST_B, "x".repeat(2001))).status, 400);
  assert.equal((await follow("A", e.DM_TEST_B, true)).status, 200);
  assert.equal((await follow("B", e.DM_TEST_A, true)).status, 200);
  const concurrent = await Promise.all([send("A", e.DM_TEST_B), send("B", e.DM_TEST_A)]);
  for (const result of concurrent) { assert.equal(result.status, 201); assert.equal(result.body.message.threadId, id); }
  const ids = new Set();
  for (let i = 0; i < 41; i++) {
    const result = await send("A", e.DM_TEST_B, `pagination-${i}`);
    assert.equal(result.status, 201); ids.add(result.body.message.id);
  }
  let cursor = null;
  const seen = new Set();
  do {
    const result = await request("A", `/api/dm/${id}${cursor ? `?before=${encodeURIComponent(cursor)}` : ""}`);
    assert.equal(result.status, 200);
    assert.ok(result.body.messages.length <= 40);
    for (const message of result.body.messages) { assert.ok(!seen.has(message.id)); seen.add(message.id); }
    cursor = result.body.nextCursor;
  } while (cursor);
  for (const messageId of ids) assert.ok(seen.has(messageId), "Persisted message missing from paginated history");
  console.log("DM regression passed: privacy, direction, unfollow, persistence, read, input, canonical pair.");
} finally {
  assert.equal((await follow("A", e.DM_TEST_B, originalA.body.isFollowing)).status, 200);
  assert.equal((await follow("B", e.DM_TEST_A, originalB.body.isFollowing)).status, 200);
}
