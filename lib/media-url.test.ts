import assert from "node:assert/strict";
import { isValidAvatarUrl, toImageKitProxyPath, toPublicImageUrl } from "./media-url";

for (const value of [
  "/media/account/bookclub/avatars/photo.jpg",
  "/media/account/photo%20one.jpg?tr=w-100",
  "https://ik.imagekit.io/account/avatar.jpg",
  "https://example.com/avatar.png",
]) {
  assert.equal(isValidAvatarUrl(value), true, value);
}

for (const value of [
  "", "/media/", "/avatar.png", "//example.com/avatar.png",
  "/media/../api/me", "/media/%2e%2e/api/me", "/media/a/./b",
  "/media/a%2fb", "/media/a%5cb", "/media/%00", "/media/%zz",
  "/media//photo.jpg", "/media/a\\b", "/media/a\nb",
  "javascript:alert(1)", "data:image/png;base64,abc", "file:///avatar.png",
  "https://user:password@example.com/avatar.png", " https://example.com/avatar.png",
]) {
  assert.equal(isValidAvatarUrl(value), false, value);
}

const legacy = "https://ik.imagekit.io/account/bookclub/avatars/photo.jpg?tr=w-100";
const proxy = "/media/account/bookclub/avatars/photo.jpg?tr=w-100";
assert.equal(toImageKitProxyPath(legacy), proxy);
assert.equal(toPublicImageUrl(legacy), proxy);
assert.equal(toPublicImageUrl(proxy), proxy);
assert.equal(toPublicImageUrl("https://example.com/photo.jpg"), "https://example.com/photo.jpg");
assert.equal(toPublicImageUrl(null), null);
assert.equal(toPublicImageUrl(undefined), undefined);
console.log("Avatar media assertions passed");
