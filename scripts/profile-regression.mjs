import assert from 'node:assert/strict';
import { usernameSchema, websiteSchema, isOwnedProfileMedia } from '../lib/profile-validation.ts';
for (const name of ['admin', 'ADMIN', 'api', 'support', 'messages', 'media', 'settings', '...', 'ab', 'a/b']) assert.equal(usernameSchema.safeParse(name).success, false, name);
for (const name of ['reader_1', 'Reader.Name', 'booklover']) assert.equal(usernameSchema.safeParse(name).success, true, name);
for (const url of ['javascript:alert(1)', '//example.com', 'https://user:pass@example.com']) assert.equal(websiteSchema.safeParse(url).success, false, url);
assert.equal(websiteSchema.safeParse('https://example.com/about').success, true);
const endpoint = 'https://ik.imagekit.io/demo';
assert.equal(isOwnedProfileMedia('/media/demo/bookclub/avatars/user1/photo.png', 'user1', 'avatars', endpoint), true);
for (const url of ['/media/demo/bookclub/avatars/user2/photo.png', '/media/demo/bookclub/avatars/user1/../photo.png', '/media/demo/bookclub/avatars/user1/%2e%2e', '/media/demo/bookclub/covers/user1/photo.png', 'https://evil.test/photo.png']) assert.equal(isOwnedProfileMedia(url, 'user1', 'avatars', endpoint), false, url);
console.log('Profile validation regression passed');

if (process.env.PROFILE_TEST_COOKIE) {
  assert.equal(process.env.PROFILE_TEST_DISPOSABLE, '1', 'Use a disposable account');
  const base = process.env.PROFILE_TEST_BASE_URL || 'http://localhost:3000';
  const headers = { Cookie: process.env.PROFILE_TEST_COOKIE, 'Content-Type': 'application/json' };
  async function request(path, data) {
    const response = await fetch(new URL(path, base), { headers, ...(data ? { method: 'PATCH', body: JSON.stringify(data) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  const original = await request('/api/me');
  assert.equal(original.status, 200);
  const { name, username, bio, location, website, avatarUrl, coverUrl } = original.body.user;
  const replacement = `reader_${Date.now()}`;
  try {
    for (const invalid of [{ username: 'API' }, { website: 'javascript:alert(1)' }, { location: 'x'.repeat(101) }, { coverUrl: '/media/other/bookclub/covers/other/file.png' }, { currentPassword: 'wrong' }]) assert.equal((await request('/api/me', invalid)).status, 400);
    const saved = await request('/api/me', { name: 'Regression Reader', username: replacement, bio: 'Profile regression', location: 'Jakarta', website: 'https://example.com' });
    assert.equal(saved.status, 200);
    assert.equal('passwordHash' in saved.body.user, false);
    const profile = await request(`/api/users/${replacement.toUpperCase()}`);
    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.location, 'Jakarta');
    assert.equal(profile.body.user.website, 'https://example.com');
    const session = await request('/api/auth/session');
    assert.equal(session.body.user.username, replacement);
    if (process.env.PROFILE_TEST_OTHER_USERNAME) assert.equal((await request('/api/me', { username: process.env.PROFILE_TEST_OTHER_USERNAME.toUpperCase() })).status, 409);
  } finally {
    assert.equal((await request('/api/me', { name, username, bio, location, website, avatarUrl, coverUrl })).status, 200, 'Restore disposable profile');
  }
  console.log('Profile API persistence/session regression passed');
}
