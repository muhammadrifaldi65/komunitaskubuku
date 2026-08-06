import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";

const schema = z.object({
  action: z.enum(["TAKEDOWN", "RESTORE"]),
  reason: z.string().max(300).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || !permissions.canTakedownPost(session.user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });

  const updated = await prisma.post.update({
    where: { id },
    data: {
      isTakenDown: parsed.data.action === "TAKEDOWN",
      takedownReason: parsed.data.action === "TAKEDOWN" ? parsed.data.reason ?? "Melanggar aturan komunitas" : null,
    },
  });

  if (parsed.data.action === "TAKEDOWN") {
    await prisma.notification.create({
      data: {
        recipientId: post.authorId,
        type: "TAKEDOWN",
        message: `Postinganmu diturunkan oleh moderator. Alasan: ${parsed.data.reason ?? "Melanggar aturan komunitas"}`,
        link: `/post/${id}`,
      },
    });
  }

  return NextResponse.json({ post: updated });
}
