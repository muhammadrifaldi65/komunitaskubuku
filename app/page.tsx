"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import FeedResults from "@/components/FeedResults";
import { toPublicImageUrl } from "@/lib/media-url";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [feed, setFeed] = useState<"all" | "following">("all");
  return <div className="feed-layout">
    <section className="feed-column" aria-label="Feed komunitas">
      <header className="feed-header"><div><h1>Ruang baca</h1><span>Cerita baru dari komunitas</span></div><Link href={session ? "/create" : "/login"} className="icon-link" aria-label="Tulis post">+</Link></header>
      <nav className="feed-tabs" aria-label="Pilihan feed"><button aria-current={feed === "all" ? "page" : undefined} onClick={() => setFeed("all")}>Untukmu</button><button aria-current={feed === "following" ? "page" : undefined} onClick={() => setFeed("following")}>Mengikuti</button></nav>
      {session && <Link href="/create" className="feed-composer"><img src={toPublicImageUrl(session.user.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.user.name || "Pembaca")}`} alt="" width={40} height={40} /><span>Ada bacaan menarik hari ini?</span><span className="composer-plus" aria-hidden="true">+</span></Link>}
      {status === "loading" ? <p role="status" className="feed-loading">Memuat ruang baca…</p> : feed === "following" && !session ? <div className="feed-empty"><h2>Ikuti pembaca favoritmu</h2><p>Masuk untuk melihat post dari orang yang kamu ikuti.</p><Link className="button-primary" href="/login">Masuk</Link></div> : <FeedResults key={`${feed}:${session?.user.id || "guest"}`} feed={feed} search="" signedIn={!!session} />}
    </section>
    <aside className="discovery-column" aria-label="Panduan komunitas">
      <section className="sidebar-widget"><span className="section-label">Ruang untuk semua pembaca</span><h2>Bacaan berikutnya bisa dimulai dari sini.</h2><p>Ulasan singkat, kutipan favorit, atau pertanyaan yang belum menemukan jawaban.</p><Link href={session ? "/create" : "/login"} className="button-primary">Bagikan cerita</Link></section>
      <section className="sidebar-widget"><h2>Rak pribadimu</h2><p>Catat buku yang ingin dibaca. Simpan post yang ingin kamu kunjungi lagi.</p><Link href={session ? "/reading-list" : "/login"} className="sidebar-row"><span>Daftar bacaan</span><span aria-hidden="true">↗</span></Link><Link href={session ? `/${session.user.username}` : "/login"} className="sidebar-row"><span>Profil & teman baca</span><span aria-hidden="true">↗</span></Link></section>
      <section className="community-note"><h2>Percakapan yang nyaman</h2><p>Hargai pendapat berbeda. Beri tanda spoiler. Sertakan judul dan penulis saat membahas buku.</p><span>PTHREE · Komunitas pecinta buku</span></section>
    </aside>
  </div>;
}
