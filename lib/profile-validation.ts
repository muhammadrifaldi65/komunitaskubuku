import { z } from "zod";

export const reservedUsernames: Record<string, true> = { admin: true, api: true, auth: true, bookmarks: true, create: true, login: true, logout: true, media: true, messages: true, notifications: true, post: true, profile: true, "reading-list": true, register: true, search: true, settings: true, support: true, verify: true, _next: true, "favicon.ico": true, "robots.txt": true, "sitemap.xml": true };
export const usernameSchema = z.string().min(3).max(24)
  .regex(/^[a-zA-Z0-9_][a-zA-Z0-9_.]*$/, "Username harus diawali huruf, angka, atau underscore")
  .refine((value) => !Object.hasOwn(reservedUsernames, value.toLowerCase()), "Username ini digunakan aplikasi");
export const websiteSchema = z.string().max(500).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}, "Website harus berupa URL http atau https");

export function isOwnedProfileMedia(value: string, userId: string, folder: "avatars" | "covers", endpoint: string | undefined): boolean {
  if (!endpoint || /[\s\\?#\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const base = new URL(endpoint).pathname.replace(/\/$/, "");
    const prefix = `/media${base}/bookclub/${folder}/${userId}/`;
    if (!value.startsWith(prefix)) return false;
    const file = value.slice(prefix.length);
    const decoded = decodeURIComponent(file);
    return !!file && decoded !== "." && decoded !== ".." && !/[\/\\\u0000-\u001f\u007f]/.test(decoded);
  } catch { return false; }
}
