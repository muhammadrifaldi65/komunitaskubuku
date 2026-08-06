import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/permissions";

const schema = z.object({ status: z.enum(["RESOLVED", "DISMISSED"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session || !permissions.canResolveReports(session.user.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });

  const report = await prisma.report.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ report });
}
