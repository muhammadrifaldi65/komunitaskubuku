import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, sendOtpEmail } from "@/lib/mail";

const schema = z.object({
  name: z.string().min(2).max(60),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username hanya boleh huruf, angka, underscore, titik"),
  email: z.string().email(),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, username, email, password } = parsed.data;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      if (existingEmail.emailVerified) {
        return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
      }
      // belum diverifikasi -> boleh daftar ulang / kirim ulang OTP
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername && existingUsername.email !== email) {
      return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = existingEmail
      ? await prisma.user.update({
          where: { email },
          data: { name, username, passwordHash },
        })
      : await prisma.user.create({
          data: { name, username, email, passwordHash },
        });

    const code = generateOtpCode();
    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: "REGISTER",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        userEmail: user.email,
      },
    });

    await sendOtpEmail(email, code, "REGISTER");

    return NextResponse.json({ message: "Kode verifikasi telah dikirim ke email kamu" });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error && err.message.toLowerCase().includes("gagal mengirim") || (err instanceof Error && err.message.includes("Resend"))
        ? (err as Error).message
        : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
