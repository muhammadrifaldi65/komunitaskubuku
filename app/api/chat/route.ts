import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const thread = await prisma.chatThread.findUnique({
    where: { userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      handledBy: { select: { name: true, username: true } },
    },
  });

  return NextResponse.json({ thread });
}

const schema = z.object({ content: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });

  const thread = await prisma.chatThread.upsert({
    where: { userId: session.user.id },
    update: { isOpen: true, updatedAt: new Date() },
    create: { userId: session.user.id },
  });

  const message = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      senderId: session.user.id,
      content: parsed.data.content,
      isFromAdmin: false,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
