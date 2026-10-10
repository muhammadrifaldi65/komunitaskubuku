<<<<<<< HEAD
# 📚 BookClub — Platform Sosial Komunitas Pecinta Buku

- Dibangun dengan Next.js 16 (App Router), Prisma + PostgreSQL (Neon), NextAuth v5, dan ImageKit (upload gambar).

## ✨ Fitur

- **Autentikasi**: login dengan akun yang dibuat oleh admin
- **Role**: `ADMIN` (akses penuh), `PEMBINA` (takedown konten, balas chat CS, tidak bisa ban/ubah role), `USER` (kelola konten & profil sendiri)
- **Sosial media**: post (teks + gambar + info buku), like/dislike, komentar (dengan balasan), share, bookmark, follow/unfollow, halaman profil
- **Algoritma feed**: skor berbasis engagement + waktu (mirip "hot score"), dengan boost untuk akun yang diikuti — lihat `lib/algorithm.ts`
- **Admin dashboard**: statistik, membuat akun pengguna, kelola pengguna (ban/role), moderasi konten (takedown/restore), kelola laporan, inbox customer service
- **Fitur minor**: notifikasi in-app, reading list (Ingin Dibaca/Sedang Dibaca/Selesai), laporkan post

## 🚀 Setup Lokal

### 1. Install dependencies
```bash
npm install
```

### 2. Siapkan environment variables
Salin `.env.example` menjadi `.env` lalu isi:

- **DATABASE_URL / DIRECT_URL**: buat project gratis di neon.tech, salin connection string (pooled untuk `DATABASE_URL`, direct untuk `DIRECT_URL`)
- **AUTH_SECRET**: jalankan `openssl rand -base64 32`
- **IMAGEKIT_***: daftar gratis di imagekit.io, ambil Public Key, Private Key, dan URL Endpoint dari dashboard Developer Options

### 3. Migrasi database & buat akun admin pertama
```bash
npx prisma migrate dev --name init
npm run db:seed
```
Ini akan membuat akun admin default: `admin@bookclub.local` / `Admin12345!` (bisa dioverride dengan env `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_USERNAME`). **Segera login dan ganti password setelah setup awal.**

### 4. Jalankan development server
```bash
npm run dev
```
Buka http://localhost:3000

## ☁️ Deploy ke Vercel

1. Push project ini ke GitHub
2. Import repo di vercel.com
3. Tambahkan semua environment variable dari `.env.example` di Project Settings → Environment Variables. Pastikan `NEXTAUTH_URL` berisi URL deployment aktif, bukan domain lama.
4. Deploy. Setelah deploy pertama berhasil, jalankan migrasi dari lokal dengan `DATABASE_URL` production (atau pakai Neon console) lalu `npm run db:seed` sekali untuk akun admin pertama

## 🗂️ Struktur Penting

```
prisma/schema.prisma       # Semua model database
lib/algorithm.ts           # Algoritma ranking feed
lib/permissions.ts         # Matriks hak akses per role
auth.ts                    # Konfigurasi NextAuth
middleware.ts               # Proteksi route admin/settings/dll
app/api/                   # Semua API route (REST)
app/admin/                 # Dashboard admin (Admin & Pembina)
components/                # PostCard, CommentSection, Navbar, dll
```

## 🔒 Catatan Keamanan

- Password di-hash dengan bcrypt
- Role `PEMBINA` tidak bisa ban akun atau mengubah role (hanya `ADMIN`)
- Semua endpoint mutasi memvalidasi sesi & kepemilikan data

## ⚠️ Catatan Penting Saat Development

Project ini pakai **Prisma 7**, yang mengubah total cara konfigurasi koneksi database dibanding versi sebelumnya:
- `url`/`directUrl` **tidak lagi** ditulis di `prisma/schema.prisma` — dipindah ke `prisma.config.ts` di root project (dipakai Prisma CLI untuk migrate/studio, pakai `DIRECT_URL`)
- Saat runtime, `lib/prisma.ts` membuat koneksi lewat **driver adapter** (`@prisma/adapter-pg`, koneksi TCP standar) memakai `DATABASE_URL` (pooled). Sengaja tidak pakai adapter WebSocket Neon (`@prisma/adapter-neon`) karena beberapa jaringan/antivirus di Windows suka blokir koneksi WebSocket keluar — koneksi TCP biasa jauh lebih stabil dan tetap kompatibel penuh dengan Neon
- Prisma Client di-generate ke folder `generated/prisma` (bukan lagi `node_modules/@prisma/client`), jadi selalu import dari `../generated/prisma/client`, bukan dari `@prisma/client` langsung (meski paket `@prisma/client` tetap wajib ter-install sebagai dependency runtime pendukung)

Project ini dibuat di lingkungan sandbox tanpa akses ke `binaries.prisma.sh`, jadi `npx prisma generate` **belum pernah berhasil dijalankan penuh** di sini (hanya sampai tahap validasi config, yang sudah saya pastikan lolos). Saat kamu jalankan `npm install` di komputer sendiri (dengan akses internet normal), `postinstall` akan otomatis menjalankan `prisma generate` dan folder `generated/prisma` beserta semua tipe TypeScript-nya akan muncul otomatis.

## 🛠️ Pengembangan Lanjutan yang Disarankan

- Rate limiting di endpoint publik (login, report)
- WebSocket/Pusher untuk chat real-time (saat ini polling setiap 8 detik)
- Infinite scroll otomatis di feed (saat ini tombol "Muat lebih banyak")
- Notifikasi email untuk aktivitas penting
=======
sadasdsa
>>>>>>> 5a1e961253c72216f96894aff1c9de38d6066836
