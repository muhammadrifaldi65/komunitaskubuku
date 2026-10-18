import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { usernameSchema } from "../lib/profile-validation";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@bookclub.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin12345!";
  const username = usernameSchema.parse(process.env.SEED_ADMIN_USERNAME || "bookclub_admin");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Akun admin sudah ada:", email);
    return;
  }

  if (await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } })) throw new Error("Username seed sudah dipakai; pilih SEED_ADMIN_USERNAME lain");
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: {
      name: "Admin BookClub",
      username,
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Akun admin berhasil dibuat:");
  console.log("  Email   :", admin.email);
  console.log("  Password:", password);
  console.log("  (Segera ganti password ini setelah login pertama kali)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
