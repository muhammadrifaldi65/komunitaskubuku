import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { uploadImageBase64 } from "@/lib/imagekit";

const schema = z.object({
  base64: z.string().min(10),
  fileName: z.string().min(1).max(200),
  folder: z.enum(["posts", "avatars"]).default("posts"),
});

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_IMAGE_BYTES / 3) + 32;

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data upload tidak valid" }, { status: 400 });

  if (parsed.data.base64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "Ukuran gambar maksimal 6MB" }, { status: 413 });
  }

  const match = /^data:image\/(jpeg|png|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(parsed.data.base64);
  if (!match || match[2].length % 4 !== 0) {
    return NextResponse.json({ error: "Gunakan gambar JPEG, PNG, GIF, atau WebP" }, { status: 400 });
  }
  const encoded = match[2];
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const imageBytes = (encoded.length / 4) * 3 - padding;
  if (imageBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Ukuran gambar maksimal 6MB" }, { status: 413 });
  }
  if (imageBytes === 0) {
    return NextResponse.json({ error: "Gambar tidak boleh kosong" }, { status: 400 });
  }

  try {
    const result = await uploadImageBase64(
      parsed.data.base64,
      parsed.data.fileName,
      `/bookclub/${parsed.data.folder}`
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengunggah gambar" }, { status: 500 });
  }
}
