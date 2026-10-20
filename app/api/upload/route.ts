import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { uploadImageBase64 } from "@/lib/imagekit";
import { prisma } from "@/lib/prisma";
import { imagekit } from "@/lib/imagekit";

const schema = z.object({
  base64: z.string().min(10),
  fileName: z.string().min(1).max(200).regex(/^[^/\\\u0000-\u001f\u007f]+$/),
  folder: z.enum(["posts", "avatars", "covers"]).default("posts"),
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
  const bytes = Buffer.from(encoded, "base64");
  const validSignature = match[1] === "jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    : match[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : match[1] === "gif" ? ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!validSignature) return NextResponse.json({ error: "Isi gambar tidak sesuai format" }, { status: 400 });

  try {
    const result = await uploadImageBase64(
      parsed.data.base64,
      parsed.data.fileName,
      `/bookclub/${parsed.data.folder}${parsed.data.folder === "posts" ? "" : `/${session.user.id}`}`
    );
    if (parsed.data.folder === "posts") {
      try {
        await prisma.postImage.create({ data: { fileId: result.fileId, url: result.url, ownerId: session.user.id } });
      } catch (error) {
        await imagekit.deleteFile(result.fileId).catch((cleanupError) => console.error("Gagal membersihkan upload yang belum tercatat", cleanupError));
        throw error;
      }
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengunggah gambar" }, { status: 500 });
  }
}
