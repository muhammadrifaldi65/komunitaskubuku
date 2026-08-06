import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, sendOtpEmail } from "@/lib/mail";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ error: "Email sudah terverifikasi" }, { status: 400 });
    }

    const lastCode = await prisma.verificationCode.findFirst({
      where: { email, type: "REGISTER" },
      orderBy: { createdAt: "desc" },
    });
    if (lastCode && Date.now() - new Date(lastCode.createdAt).getTime() < 60 * 1000) {
      return NextResponse.json({ error: "Tunggu sebentar sebelum meminta kode baru" }, { status: 429 });
    }

    const code = generateOtpCode();
    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: "REGISTER",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        userEmail: email,
      },
    });
    await sendOtpEmail(email, code, "REGISTER");

    return NextResponse.json({ message: "Kode verifikasi baru telah dikirim" });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error && err.message.toLowerCase().includes("gagal mengirim")
        ? err.message
        : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
