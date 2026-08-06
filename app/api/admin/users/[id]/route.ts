import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";

const schema = z.object({
  action: z.enum(["BAN", "UNBAN", "CHANGE_ROLE"]),
  banReason: z.string().max(300).optional(),
  role: z.enum(["ADMIN", "PEMBINA", "USER"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  if (id === session.user.id) {
    return NextResponse.json({ error: "Tidak bisa mengubah akun sendiri di sini" }, { status: 400 });
  }

  if (parsed.data.action === "BAN" || parsed.data.action === "UNBAN") {
    if (!permissions.canBanUser(session.user.role)) {
      return NextResponse.json({ error: "Hanya Admin yang bisa ban/unban akun" }, { status: 403 });
    }
    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned: parsed.data.action === "BAN",
        banReason: parsed.data.action === "BAN" ? parsed.data.banReason ?? "Melanggar aturan komunitas" : null,
      },
    });
    return NextResponse.json({ user });
  }

  if (parsed.data.action === "CHANGE_ROLE") {
    if (!permissions.canChangeUserRole(session.user.role)) {
      return NextResponse.json({ error: "Hanya Admin yang bisa mengubah role" }, { status: 403 });
    }
    if (!parsed.data.role) return NextResponse.json({ error: "Role wajib diisi" }, { status: 400 });
    const user = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
    });
    return NextResponse.json({ user });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || !permissions.canDeleteUserAccount(session.user.role)) {
    return NextResponse.json({ error: "Hanya Admin yang bisa menghapus akun" }, { status: 403 });
  }
  if (id === session.user.id) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ message: "Akun dihapus" });
}
