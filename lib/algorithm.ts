/**
 * Algoritma ranking feed - mirip "hot score" ala Reddit,
 * dikombinasikan dengan bobot personalisasi (mengikuti/tidak).
 *
 * score = engagementScore / (jamSejakPosting + 2) ^ gravity
 * engagementScore = (like*2 - dislike*1.5 + komentar*3 + share*2.5)
 *
 * followedBoost: +40% skor kalau post berasal dari user yang di-follow,
 * supaya feed tetap terasa personal tanpa jadi bubble total (masih ada
 * konten trending dari orang yang tidak diikuti).
 */
const GRAVITY = 1.5;

export interface RankablePost {
  id: string;
  createdAt: Date;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  shareCount: number;
  authorId: string;
}

export function computePostScore(post: RankablePost, followedAuthorIds: Set<string>): number {
  const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / 1000 / 60 / 60;

  const engagement =
    post.likeCount * 2 -
    post.dislikeCount * 1.5 +
    post.commentCount * 3 +
    post.shareCount * 2.5;

  // baseline supaya post baru (engagement 0) tetap muncul, bukan minus/nol
  const base = engagement + 1;

  let score = base / Math.pow(ageHours + 2, GRAVITY);

  if (followedAuthorIds.has(post.authorId)) {
    score *= 1.4;
  }

  return score;
}

export function rankPosts<T extends RankablePost>(posts: T[], followedAuthorIds: Set<string>): T[] {
  return [...posts].sort((a, b) => computePostScore(b, followedAuthorIds) - computePostScore(a, followedAuthorIds));
}
