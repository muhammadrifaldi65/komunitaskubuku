import { prisma } from "@/lib/prisma";
import { dmActor, dmCanSend, dmError, DmError, dmUserSelect } from "@/lib/dm";

export async function GET(req: Request) {
  try {
    const actor = await dmActor();
    const username = new URL(req.url).searchParams.get("username");
    if (!username || username.length > 100) throw new DmError("Nama pengguna tidak valid", 400);
    const recipient = await prisma.user.findUnique({ where: { username }, select: dmUserSelect });
    if (!recipient || recipient.isBanned) throw new DmError("Pengguna tidak ditemukan", 404);
    if (recipient.id === actor.id) throw new DmError("Tidak bisa mengirim pesan kepada diri sendiri", 400);
    const [firstId, secondId] = [actor.id, recipient.id].sort();
    const thread = await prisma.dmThread.findUnique({ where: { firstId_secondId: { firstId, secondId } }, select: { id: true } });
    return Response.json({ recipient, threadId: thread?.id ?? null, canSend: await dmCanSend(actor.id, recipient) });
  } catch (error) { return dmError(error); }
}
