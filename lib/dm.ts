import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export class DmError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export const dmUserSelect = { id: true, username: true, name: true, avatarUrl: true, isBanned: true } as const;
export async function dmActor() {
  const session = await auth();
  if (!session?.user?.id) throw new DmError("Harus login", 401);
  const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: dmUserSelect });
  if (!actor) throw new DmError("Sesi tidak berlaku. Silakan login kembali", 401);
  if (actor.isBanned) throw new DmError("Akun tidak dapat mengakses pesan", 403);
  return actor;
}
export function dmError(error: unknown) {
  if (error instanceof DmError) return Response.json({ error: error.message }, { status: error.status });
  console.error("DM request failed", error);
  return Response.json({ error: "Gagal memuat atau menyimpan pesan. Silakan coba lagi" }, { status: 500 });
}
export function dmCursor(date: Date, id: string) {
  return Buffer.from(JSON.stringify([date.toISOString(), id])).toString("base64url");
}
export function dmPage(url: string) {
  const params = new URL(url).searchParams;
  const raw = params.get("before");
  if (!raw) return null;
  try {
    if (raw.length > 512) throw new Error();
    const value: unknown = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== "string" || typeof value[1] !== "string" || !value[1] || value[1].length > 100) throw new Error();
    const date = new Date(value[0]);
    if (!Number.isFinite(date.getTime())) throw new Error();
    return { date, id: value[1] };
  } catch { throw new DmError("Penanda halaman tidak valid", 400); }
}
export async function dmThread(id: string, actorId: string) {
  const thread = await prisma.dmThread.findFirst({
    where: { id, OR: [{ firstId: actorId }, { secondId: actorId }] },
    include: { first: { select: dmUserSelect }, second: { select: dmUserSelect } },
  });
  if (!thread) throw new DmError("Percakapan tidak ditemukan", 404);
  return thread;
}
export async function dmCanSend(senderId: string, recipient: { id: string; isBanned: boolean }) {
  if (recipient.isBanned || recipient.id === senderId) return false;
  return !!await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: recipient.id, followingId: senderId } }, select: { id: true } });
}
