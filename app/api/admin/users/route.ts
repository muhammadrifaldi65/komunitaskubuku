import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { usernameSchema } from "@/lib/profile-validation";

const createUserSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya Admin yang bisa membuat akun" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { username, email, password } = parsed.data;
  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } }),
  ]);

  if (existingEmail) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }
  if (existingUsername) {
    return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
  const user = await prisma.user.create({
    data: {
      name: username,
      username,
      email,
      passwordHash,
    },
    select: { id: true, username: true, email: true },
  });

  return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Email atau username sudah dipakai" }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Gagal membuat akun" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !permissions.canAccessAdminDashboard(session.user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      banReason: true,
      createdAt: true,
      avatarUrl: true,
      _count: { select: { posts: true } },
    },
    take: 100,
  });

  return NextResponse.json({ users });
}
