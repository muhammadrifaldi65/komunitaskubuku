import { NextResponse } from "next/server";

function imageKitUrl(path: string[], search: string) {
  const endpoint = new URL(process.env.IMAGEKIT_URL_ENDPOINT!);
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const upstream = new URL(`${endpoint.origin}/${encodedPath}`);
  upstream.search = search;
  return upstream;
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!path.length || path.some((segment) => segment === "." || segment === "..")) {
    return NextResponse.json({ error: "Path media tidak valid" }, { status: 400 });
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = imageKitUrl(path, new URL(req.url).search);
  } catch {
    return NextResponse.json({ error: "ImageKit belum dikonfigurasi" }, { status: 500 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { Accept: req.headers.get("accept") || "image/*" },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });
  } catch (error) {
    console.error("ImageKit media connection failed", upstreamUrl.hostname, error);
    return NextResponse.json(
      { error: "Gambar belum dapat dimuat. Periksa koneksi dan DNS server ke ImageKit." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");

  return new NextResponse(upstream.body, { status: 200, headers });
}
