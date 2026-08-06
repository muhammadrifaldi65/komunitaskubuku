import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";

export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const session = await auth();
  if (!session || !permissions.canAnswerChat(session.user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ thread });
}

const schema = z.object({ content: z.string().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const session = await auth();
  if (!session || !permissions.canAnswerChat(session.user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });

  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });

  const message = await prisma.chatMessage.create({
    data: {
      threadId,
      senderId: session.user.id,
      content: parsed.data.content,
      isFromAdmin: true,
    },
  });

  await prisma.chatThread.update({
    where: { id: threadId },
    data: { handledById: session.user.id, updatedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      recipientId: thread.userId,
      actorId: session.user.id,
      type: "CHAT",
      message: "membalas pesan customer service kamu",
      link: `/messages`,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const session = await auth();
  if (!session || !permissions.canAnswerChat(session.user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const isOpen = typeof body.isOpen === "boolean" ? body.isOpen : false;

  const thread = await prisma.chatThread.update({
    where: { id: threadId },
    data: { isOpen },
  });
  return NextResponse.json({ thread });
}
