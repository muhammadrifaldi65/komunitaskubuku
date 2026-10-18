import { prisma } from "@/lib/prisma";
import { dmActor, dmCanSend, dmCursor, dmError, DmError, dmPage, dmThread } from "@/lib/dm";

type Context = { params: Promise<{ threadId: string }> };
export async function GET(req: Request, context: Context) {
  try {
    const actor = await dmActor();
    const { threadId } = await context.params;
    const thread = await dmThread(threadId, actor.id);
    const cursor = dmPage(req.url);
    const rows = await prisma.dmMessage.findMany({
      where: { threadId, ...(cursor ? { OR: [{ createdAt: { lt: cursor.date } }, { createdAt: cursor.date, id: { lt: cursor.id } }] } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 41,
    });
    const page = rows.slice(0, 40);
    const last = page.at(-1);
    const recipient = thread.firstId === actor.id ? thread.second : thread.first;
    return Response.json({ thread: { id: thread.id, recipient, canSend: await dmCanSend(actor.id, recipient) }, messages: page.reverse(), nextCursor: rows.length > 40 && last ? dmCursor(last.createdAt, last.id) : null });
  } catch (error) { return dmError(error); }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const actor = await dmActor();
    const { threadId } = await context.params;
    await dmThread(threadId, actor.id);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.messageId !== "string" || body.messageId.length > 100) throw new DmError("Pesan terakhir wajib dipilih", 400);
    const boundary = await prisma.dmMessage.findFirst({ where: { id: body.messageId, threadId } });
    if (!boundary) throw new DmError("Pesan tidak ditemukan", 404);
    // Only acknowledge displayed messages, never a message arriving after this page.
    await prisma.dmMessage.updateMany({ where: {
      threadId, senderId: { not: actor.id }, readAt: null,
      OR: [{ createdAt: { lt: boundary.createdAt } }, { createdAt: boundary.createdAt, id: { lte: boundary.id } }],
    }, data: { readAt: new Date() } });
    return Response.json({ ok: true });
  } catch (error) { return dmError(error); }
}
