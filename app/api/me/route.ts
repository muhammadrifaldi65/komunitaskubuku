import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnedProfileMedia, usernameSchema, websiteSchema } from "@/lib/profile-validation";

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  username: usernameSchema.optional(),
  bio: z.string().max(300).nullable().optional(),
  location: z.string().trim().max(100).nullable().optional(),
  website: websiteSchema.nullable().optional(),
  avatarUrl: z.string().max(2048).nullable().optional(),
  coverUrl: z.string().max(2048).nullable().optional(),
  currentPassword: z.string().min(1).max(200).optional(),
  newPassword: z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password maksimal 72 byte").optional(),
}).strict();
const publicSelect = { id: true, username: true, name: true, email: true, bio: true, location: true, website: true, avatarUrl: true, coverUrl: true, role: true, createdAt: true } as const;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: publicSelect });
  if (!user) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ user }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { currentPassword, newPassword, ...data } = parsed.data;
  if (!!currentPassword !== !!newPassword) return NextResponse.json({ error: "Isi password lama dan baru untuk mengganti password" }, { status: 400 });
  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true, avatarUrl: true, coverUrl: true, isBanned: true } });
  if (!current || current.isBanned) return NextResponse.json({ error: "Akun tidak dapat diperbarui" }, { status: 403 });
  for (const [field, folder] of [["avatarUrl", "avatars"], ["coverUrl", "covers"]] as const) {
    const value = data[field];
    if (value != null && value !== current[field] && !isOwnedProfileMedia(value, session.user.id, folder, process.env.IMAGEKIT_URL_ENDPOINT)) {
      return NextResponse.json({ error: "Gunakan gambar yang diunggah melalui akun Anda" }, { status: 400 });
    }
  }
  if (data.username && await prisma.user.findFirst({ where: { username: { equals: data.username, mode: "insensitive" }, id: { not: session.user.id } }, select: { id: true } })) return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
  let passwordHash: string | undefined;
  if (currentPassword && newPassword) {
    if (!(await bcrypt.compare(currentPassword, current.passwordHash))) return NextResponse.json({ error: "Password lama tidak cocok" }, { status: 400 });
    passwordHash = await bcrypt.hash(newPassword, 10);
  }
  try {
    const user = await prisma.user.update({ where: { id: session.user.id }, data: { ...data, ...(passwordHash ? { passwordHash } : {}) }, select: publicSelect });
    return NextResponse.json({ user });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Gagal menyimpan profil" }, { status: 500 });
  }
}
