import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { uploadImageBase64 } from "@/lib/imagekit";

const schema = z.object({
  base64: z.string().min(10),
  fileName: z.string().min(1).max(200),
  folder: z.enum(["posts", "avatars"]).default("posts"),
});

const MAX_BASE64_LENGTH = 8_000_000; // ~6MB gambar

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data upload tidak valid" }, { status: 400 });

  if (parsed.data.base64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "Ukuran gambar maksimal 6MB" }, { status: 413 });
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
