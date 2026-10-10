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
