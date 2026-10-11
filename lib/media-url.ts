export function toImageKitProxyPath(imageUrl: string): string {
  const parsed = new URL(imageUrl);
  return `/media${parsed.pathname}${parsed.search}`;
}

export function toPublicImageUrl(imageUrl: string | null | undefined): string | null | undefined {
  if (!imageUrl || imageUrl.startsWith("/media/")) return imageUrl;

  try {
    const parsed = new URL(imageUrl);
    if (parsed.hostname === "ik.imagekit.io" || parsed.hostname.endsWith(".imagekit.io")) {
      return toImageKitProxyPath(imageUrl);
    }
  } catch {
    return imageUrl;
  }

  return imageUrl;
}

export function isValidAvatarUrl(value: string): boolean {
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    if (value.startsWith("/media/")) {
      const path = value.split(/[?#]/, 1)[0];
      return path.slice(7).split("/").every((segment) => {
        const decoded = decodeURIComponent(segment);
        return decoded !== "" && decoded !== "." && decoded !== ".." && !/[\/\\\u0000-\u001f\u007f]/.test(decoded);
      });
    }
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch {
    return false;
  }
}
