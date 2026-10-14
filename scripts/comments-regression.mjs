// Disposable posts only; creates comments. Set COMMENTS_TEST_DISPOSABLE=1,
// COMMENTS_TEST_COOKIE, COMMENTS_TEST_POST, COMMENTS_TEST_OTHER_POST.
// Run: node scripts/comments-regression.mjs
import assert from "node:assert/strict";
const env = process.env;
assert.equal(env.COMMENTS_TEST_DISPOSABLE, "1", "Use disposable posts only");
const cookie = env.COMMENTS_TEST_COOKIE;
const post = env.COMMENTS_TEST_POST;
const other = env.COMMENTS_TEST_OTHER_POST;
assert.ok(cookie && post && other, "Provide cookie and two visible disposable post IDs");
assert.notEqual(post, other);
const base = env.COMMENTS_TEST_BASE_URL || "http://localhost:3000";
async function request(path, options = {}) {
  const response = await fetch(new URL(path, base), { ...options, headers: { Cookie: cookie, "Content-Type": "application/json", ...options.headers } });
  return { status: response.status, body: await response.json() };
}
const endpoint = (id) => `/api/posts/${encodeURIComponent(id)}/comments`;
const create = (id, body) => request(endpoint(id), { method: "POST", body: JSON.stringify(body) });
const baseline = await request(`/api/posts/${encodeURIComponent(post)}`);
assert.equal(baseline.status, 200);
assert.equal((await request(endpoint(post), { method: "POST", body: "{" })).status, 400);
for (const body of [{ content: " \n\t " }, { content: "reply", parentId: "" }, { content: "reply", parentId: 42 }, { content: "reply", parentId: "missing-comment" }]) {
  assert.equal((await create(post, body)).status, 400);
}
for (const hiddenPost of [env.COMMENTS_TEST_TAKEN_DOWN_POST, env.COMMENTS_TEST_BANNED_AUTHOR_POST].filter(Boolean)) {
  assert.equal((await request(endpoint(hiddenPost))).status, 404);
  assert.equal((await create(hiddenPost, { content: "Must not be stored" })).status, 404);
}
assert.equal((await request(endpoint(post), { method: "POST", headers: { Cookie: "" }, body: '{"content":"anonymous"}' })).status, 401);
const foreign = await create(other, { content: "Cross-post parent regression" });
assert.equal(foreign.status, 201);
assert.equal((await create(post, { content: "Invalid cross-post reply", parentId: foreign.body.comment.id })).status, 400);
const text = "First line\n  second line";
const root = await create(post, { content: text });
assert.equal(root.status, 201);
assert.equal(root.body.comment.content, text);
let parentId = root.body.comment.id;
const ids = [];
for (let depth = 0; depth < 6; depth++) {
  const reply = await create(post, { content: `Reply depth ${depth + 1}`, parentId });
  assert.equal(reply.status, 201);
  assert.equal(reply.body.comment.parentId, parentId);
  parentId = reply.body.comment.id;
  ids.push(parentId);
}
const tree = await request(endpoint(post));
assert.equal(tree.status, 200);
let node = tree.body.comments.find((comment) => comment.id === root.body.comment.id);
assert.ok(node);
for (const id of ids) {
  node = node.replies.find((reply) => reply.id === id);
  assert.ok(node, "Reply must remain attached to its actual target");
}
const after = await request(`/api/posts/${encodeURIComponent(post)}`);
assert.equal(after.body.post.commentCount, baseline.body.post.commentCount + 7);
console.log("Comments regression passed: auth, malformed JSON, blank content, invalid/cross-post parents, whitespace, deep target tree, counter.");
