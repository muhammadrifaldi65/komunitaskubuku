import { prisma } from "@/lib/prisma";
import { dmActor, dmCursor, dmError, DmError, dmPage, dmUserSelect } from "@/lib/dm";

export async function GET(req: Request) {
  try {
    const actor = await dmActor();
    const cursor = dmPage(req.url);
    const membership = { OR: [{ firstId: actor.id }, { secondId: actor.id }] };
    const rows = await prisma.dmThread.findMany({
      where: { AND: [membership, ...(cursor ? [{ OR: [{ updatedAt: { lt: cursor.date } }, { updatedAt: cursor.date, id: { lt: cursor.id } }] }] : [])] },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 21,
      include: {
        first: { select: dmUserSelect }, second: { select: dmUserSelect },
        messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
        _count: { select: { messages: { where: { senderId: { not: actor.id }, readAt: null } } } },
      },
    });
    const page = rows.slice(0, 20);
    const last = page.at(-1);
    const unreadCount = await prisma.dmMessage.count({ where: { thread: membership, senderId: { not: actor.id }, readAt: null } });
    return Response.json({
      threads: page.map((t) => ({ id: t.id, updatedAt: t.updatedAt, recipient: t.firstId === actor.id ? t.second : t.first, lastMessage: t.messages[0] ?? null, unreadCount: t._count.messages })),
      unreadCount, nextCursor: rows.length > 20 && last ? dmCursor(last.updatedAt, last.id) : null,
    });
  } catch (error) { return dmError(error); }
}

export async function POST(req: Request) {
  try {
    const actor = await dmActor();
    const body = await req.json().catch(() => null);
    if (!body || typeof body.username !== "string" || !body.username || body.username.length > 100 || typeof body.content !== "string" || !body.content.trim() || body.content.trim().length > 2000) {
      throw new DmError("Penerima wajib dipilih dan pesan harus berisi 1–2000 karakter", 400);
    }
    const recipient = await prisma.user.findUnique({ where: { username: body.username }, select: { id: true } });
    if (!recipient) throw new DmError("Pengguna tidak ditemukan", 404);
    if (recipient.id === actor.id) throw new DmError("Tidak bisa mengirim pesan kepada diri sendiri", 400);
    const [firstId, secondId] = [actor.id, recipient.id].sort();
    const content = body.content.trim();
    const message = await prisma.$transaction(async (tx) => {
      // Follow writes lock their target User. Lock both users in canonical order:
      // concurrent unfollow, bans, deletion and opposite-direction sends serialize.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" IN (${firstId}, ${secondId}) ORDER BY "id" COLLATE "C" FOR NO KEY UPDATE`;
      const users = await tx.user.findMany({ where: { id: { in: [firstId, secondId] } }, select: { id: true, isBanned: true } });
      if (users.length !== 2 || users.some((u) => u.isBanned)) throw new DmError("Akun pengirim atau penerima tidak tersedia", 403);
      const follows = await tx.follow.findUnique({ where: { followerId_followingId: { followerId: recipient.id, followingId: actor.id } } });
      if (!follows) throw new DmError("Pesan hanya dapat dikirim jika penerima mengikuti kamu", 403);
      const thread = await tx.dmThread.upsert({ where: { firstId_secondId: { firstId, secondId } }, create: { firstId, secondId }, update: { updatedAt: new Date() } });
      return tx.dmMessage.create({ data: { threadId: thread.id, senderId: actor.id, content, createdAt: new Date() } });
    }, { maxWait: 15_000, timeout: 15_000 });
    return Response.json({ message }, { status: 201 });
  } catch (error) { return dmError(error); }
}
