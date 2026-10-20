
# PTHREE — Platform Sosial Komunitas Pecinta Buku

- Dibangun dengan Next.js 16 (App Router), Prisma + PostgreSQL (Neon), NextAuth v5, dan ImageKit (upload gambar).

## ✨ Fitur

- **Autentikasi**: login dengan akun yang dibuat oleh admin
- **Role**: `ADMIN` (akses penuh), `PEMBINA` (takedown konten, balas chat CS, tidak bisa ban/ubah role), `USER` (kelola konten & profil sendiri)
- **Sosial media**: post (teks + gambar + info buku), like/dislike, komentar (dengan balasan), share, bookmark, follow/unfollow, halaman profil
- **Algoritma feed**: skor berbasis engagement + waktu (mirip "hot score"), dengan boost untuk akun yang diikuti — lihat `lib/algorithm.ts`
- **Admin dashboard**: statistik, membuat akun pengguna, kelola pengguna (ban/role), moderasi konten (takedown/restore), kelola laporan, inbox customer service
- **Fitur minor**: notifikasi in-app, reading list (Ingin Dibaca/Sedang Dibaca/Selesai), laporkan post
- **Tampilan**: feed tiga kolom di desktop, navigasi menu di mobile, sans-serif dan aksen biru; nama PTHREE serta rute fitur tetap. Dashboard admin menyediakan kelima menu di mobile dan desktop.
- **Avatar**: upload dan gambar post memakai path publik `/media/...`; URL ImageKit lama dinormalisasi. Simpan profil memperbarui avatar sesi tanpa login ulang.
- **Pencarian**: cari isi post, judul buku, atau penulis. Tab **Mengikuti** hanya memuat post akun yang diikuti; perlu login.
- **Hapus post**: menu opsi pada post sendiri menyediakan hapus permanen dengan konfirmasi. Feed/profil diperbarui setelah berhasil; halaman detail kembali ke beranda. Admin tetap dapat menghapus post pengguna lain.
- **Spoiler**: saat membuat post, centang **Mengandung spoiler** untuk menyembunyikan isi dan gambar di feed, profil, bookmark, dan halaman detail sampai pembaca menekan **Tampilkan isi dan gambar**. Judul/penulis buku tetap terlihat. Post lama tidak ditandai.

### Profil, trending, dan pesan pribadi

- Tampilan profil mengikuti susunan X: sampul penuh rasio 3:1, avatar bulat menumpuk tepi bawah sampul, tombol aksi di kanan, identitas rapat di bawah. Responsif desktop/mobile.

- `/settings`: nama, username unik (3–24 karakter), bio, lokasi, website HTTP(S), avatar/sampul, serta ganti password dengan password lama. Avatar/sampul diunggah ke folder milik pengguna dan disajikan melalui `/media/...` pada domain aplikasi.
- Profil publik memakai `/<username>`; username rute aplikasi seperti `admin`, `settings`, dan `messages` dilarang. Perubahan username langsung memperbarui sesi. URL profil lama tidak dipertahankan.
- Klik pencarian/Jelajahi menampilkan 10 hashtag terbanyak selama 24 jam terakhir. Penghitungan tidak membedakan kapital, satu hashtag dihitung sekali per post; post diturunkan dan akun diblokir dikecualikan. Klik hashtag mencari tag utuh, bukan awalan.
- `/messages`: DM privat, unread, riwayat berpaginasi, polling 8 detik. Pengiriman hanya diizinkan bila **penerima mengikuti pengirim**, diperiksa lagi setiap pengiriman termasuk setelah unfollow. Hanya kedua peserta bisa mengakses isi atau menandai pesan dibaca. Customer service tetap tersedia di `/support`.
- Migrasi: `npx prisma migrate deploy && npx prisma generate`. Migrasi menolak username lama yang bentrok/terlarang tanpa menggantinya diam-diam; pilih pengganti sebelum menjalankannya. Seed baru menggunakan `bookclub_admin`.
- Setelah pembaruan spoiler, jalankan `npx prisma migrate deploy && npx prisma generate` sebelum memulai aplikasi.
- Verifikasi: `npx tsx scripts/profile-regression.mjs`, `npx tsx scripts/hashtags-regression.ts`, dan `node scripts/dm-regression.mjs`. Regresi DM membutuhkan tiga akun sekali pakai; variabel lingkungan tercantum di awal skrip. Skrip hashtag memakai PostgreSQL nyata tanpa mengubah data.
- Production self-hosted: set `AUTH_TRUST_HOST=true` hanya jika host/proxy deployment dikendalikan sendiri dan header Host diteruskan secara tepercaya; tanpa konfigurasi tersebut Auth.js bisa menolak sesi dengan `UntrustedHost`.

### Feed dan penghapusan

- `GET /api/posts?q=...&feed=all|following&cursor=...`: pencarian tanpa membedakan huruf besar/kecil, maksimal 100 karakter. Reset cursor saat filter berubah. Post akun diblokir atau konten diturunkan tidak ditampilkan.
- Pagination mengikuti urutan waktu dan ID, 20 post per halaman; ranking diterapkan di dalam halaman agar tidak melewatkan atau menggandakan post.
- `DELETE /api/posts/:id`: hanya pemilik atau admin; komentar/reaksi terkait ikut terhapus. Gambar ImageKit yang diunggah setelah migrasi kepemilikan dihapus bila ID, URL, post, dan pemilik cocok. File lama tanpa catatan kepemilikan tidak dihapus otomatis.
- Jika ImageKit gagal saat penghapusan, catatan `pendingDelete` disimpan; jalankan `npx tsx scripts/cleanup-post-images.ts` untuk mencoba lagi. Terapkan migrasi dengan `npx prisma migrate deploy`, lalu `npx prisma generate` sebelum memulai aplikasi.
- Regresi feed: `node scripts/feed-regression.mjs`.
- Regresi hapus: `node scripts/delete-post-regression.mjs`, dengan `DELETE_TEST_DISPOSABLE=1`, `DELETE_TEST_OWNER_COOKIE`, `DELETE_TEST_OTHER_COOKIE`; opsional `DELETE_TEST_ADMIN_COOKIE`. Gunakan akun uji sekali pakai.

### Follow dan pengikut

- `PUT /api/users/:username/follow` menerima `{ "following": true }` atau `false`. Idempoten: request berulang tidak membalik status; relasi dan notifikasi disimpan dalam satu transaksi. `POST` toggle lama tidak digunakan.
- `GET /api/users/:username/connections?kind=followers|following&after=<id>` mengembalikan `{ members, total, nextCursor }`, maksimal 30 anggota aktif per halaman.
- Jumlah pengikut/mengikuti tidak mencakup akun diblokir. Relasi Prisma telah dikoreksi; jalankan `npx prisma generate`, lalu restart server setelah memperbarui kode. Tidak ada perubahan tabel atau migrasi data.
- Cek avatar: `npx tsx lib/media-url.test.ts`.
- Cek follow: jalankan `node scripts/follow-regression.mjs` dengan `FOLLOW_TEST_DISPOSABLE=1`, `FOLLOW_TEST_COOKIE`, `FOLLOW_TEST_ACTOR`, `FOLLOW_TEST_TARGET`; opsional `FOLLOW_TEST_BASE_URL`. Wajib dua akun uji sekali pakai karena pengujian membuat notifikasi.

### Composer, markah, dan komentar

- `/create`: penghitung 3.000 karakter, informasi buku opsional, pratinjau gambar, batas 6 MB, status upload/publikasi, dan pencegahan kirim ganda. Kegagalan tidak mengosongkan draf pada halaman.
- `/bookmarks`: markah privat disimpan di database, tetap tersedia setelah refresh. `PUT /api/posts/:id/bookmark` menerima `{ "bookmarked": true }` atau `false`; idempoten. `GET /api/bookmarks?cursor=...` mengurutkan waktu penyimpanan dengan pagination 20 post.
- Balasan komentar tersembunyi sampai tombol **Lihat balasan lainnya** ditekan; dapat disembunyikan kembali. Balasan mempertahankan komentar tujuan, termasuk percakapan bertingkat.
- Penulis komentar atau `ADMIN` dapat menghapus komentar beserta semua balasannya setelah konfirmasi. API `DELETE /api/posts/:id/comments/:commentId` memeriksa izin dan memperbarui penghitung komentar. `PEMBINA` hanya dapat menghapus komentar sendiri.
- Regresi: `node scripts/bookmark-regression.mjs` dan `node scripts/comments-regression.mjs`. Variabel akun/post uji dijelaskan pada awal masing-masing skrip; gunakan data sekali pakai.
- Media ImageKit: kegagalan koneksi upstream mengembalikan HTTP 502 tanpa cache. `UND_ERR_CONNECT_TIMEOUT` berarti koneksi server ke ImageKit tidak tersambung; periksa DNS, firewall, dan akses HTTPS server. Penanganan error aplikasi tidak memperbaiki jaringan eksternal.

## 🚀 Setup Lokal

### 1. Install dependencies
```bash
npm install
```

### 2. Siapkan environment variables
Salin `.env.example` menjadi `.env` lalu isi:

- **DATABASE_URL / DIRECT_URL**: buat project gratis di neon.tech, salin connection string (pooled untuk `DATABASE_URL`, direct untuk `DIRECT_URL`)
- **AUTH_SECRET**: jalankan `openssl rand -base64 32`
- **IMAGEKIT_***: daftar gratis di imagekit.io, ambil Public Key, Private Key, dan URL Endpoint dari dashboard Developer Options. Upload tetap masuk ImageKit; URL publik aplikasi dilayani melalui path `/media/...`, jadi DNS domain cukup mengarah ke aplikasi.

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


