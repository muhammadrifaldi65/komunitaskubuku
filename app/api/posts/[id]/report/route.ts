import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ reason: z.string().min(3).max(500) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Alasan laporan wajib diisi" }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });

  await prisma.report.create({
    data: { postId, reporterId: session.user.id, reason: parsed.data.reason },
  });

  return NextResponse.json({ message: "Laporan terkirim, tim kami akan meninjau" });
}
