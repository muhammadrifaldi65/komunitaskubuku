import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI (migrate, studio, db push) butuh koneksi langsung (bukan pooled),
    // jadi pakai DIRECT_URL di sini. Runtime app tetap pakai DATABASE_URL (pooled)
    // lewat driver adapter di lib/prisma.ts.
    url: env("DIRECT_URL"),
  },
});
