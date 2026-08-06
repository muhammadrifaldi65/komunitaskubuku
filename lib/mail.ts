import nodemailer from "nodemailer";

console.log("=== SMTP DEBUG ===");
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS exists:", !!process.env.SMTP_PASS);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || "BookClub <no-reply@bookclub.com>";

export async function sendOtpEmail(to: string, code: string, purpose: "REGISTER" | "RESET_PASSWORD") {
  const subject =
    purpose === "REGISTER"
      ? "Kode Verifikasi Registrasi - BookClub"
      : "Kode Reset Password - BookClub";

  const html = `
  <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
    <h2>${subject}</h2>
    <p>Gunakan kode berikut untuk melanjutkan proses di BookClub:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background:#f3f4f6; padding: 16px; text-align:center; border-radius:8px;">
      ${code}
    </div>
    <p>Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun.</p>
    <p style="color:#888; font-size:12px;">Jika kamu tidak merasa melakukan permintaan ini, abaikan email ini.</p>
  </div>`;

  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Failed to send email:", err);
    throw new Error("Gagal mengirim email verifikasi");
  }
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}