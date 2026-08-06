import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  bookTitle: z.string().min(1).max(200),
  bookAuthor: z.string().max(200).optional().nullable(),
  status: z.enum(["WANT_TO_READ", "READING", "FINISHED"]).default("WANT_TO_READ"),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const items = await prisma.readingListItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Harus login" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const item = await prisma.readingListItem.create({
    data: { ...parsed.data, userId: session.user.id },
  });
  return NextResponse.json({ item }, { status: 201 });
}
