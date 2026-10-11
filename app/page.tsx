"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PostCard, { PostData } from "@/components/PostCard";

export default function HomePage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(initial = false) {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/posts", window.location.origin);
      if (!initial && cursor) url.searchParams.set("cursor", cursor);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Feed tidak dapat dimuat. Coba lagi.");
      const data = await res.json();
      setPosts((prev) => initial ? data.posts : [...prev, ...data.posts]);
      setCursor(data.nextCursor);
    } catch {
      setError("Feed tidak dapat dimuat. Periksa koneksi, lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="home-shell">
      <section className="editorial-intro" aria-labelledby="home-heading">
        <p className="eyebrow">Catatan, cerita, dan percakapan</p>
        <h1 id="home-heading">Buku selesai.<br /><em>Percakapan berlanjut.</em></h1>
        <div className="intro-bottom">
          <p>Temukan bacaan berikutnya lewat cerita pembaca lainnya.<br className="hidden sm:block" /> Bagikan halaman yang membuatmu berhenti sejenak.</p>
          <Link href={session ? "/create" : "/login"} className="text-link">{session ? "Bagikan bacaanmu" : "Gabung percakapan"} <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <div className="feed-layout">
        <section aria-labelledby="feed-heading" className="min-w-0">
          <div className="section-heading"><h2 id="feed-heading">Di ruang baca</h2><span>Untukmu</span></div>
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
          {loading && <div role="status" className="feed-loading"><span className="eyebrow">Membuka halaman</span><p>Memuat percakapan…</p></div>}
          {error && <div role="alert" className="feed-empty"><h3>Halaman belum terbuka.</h3><p>{error}</p><button className="button-primary" onClick={() => load(posts.length === 0)}>Coba lagi</button></div>}
          {!loading && !error && posts.length === 0 && <div className="feed-empty"><span className="eyebrow">Ruang untuk ceritamu</span><h3>Apa yang sedang kamu baca?</h3><p>Satu kutipan, ulasan singkat, atau pertanyaan.<br />Percakapan pertama bisa dimulai darimu.</p><Link href={session ? "/create" : "/login"} className="button-primary">Tulis post pertama <span aria-hidden="true">+</span></Link></div>}
          {!loading && !error && cursor && <button onClick={() => load(false)} className="load-more">Baca percakapan lainnya <span aria-hidden="true">↓</span></button>}
        </section>
        <aside className="reading-sidebar" aria-label="Sudut pembaca">
          <span className="eyebrow">Sudut pembaca</span>
          <h2>Bacaan bagus<br /> layak dibagikan.</h2>
          <p>Simpan post yang ingin kamu baca kembali. Susun daftar bacaanmu, satu penemuan setiap waktu.</p>
          <Link href={session ? "/reading-list" : "/login"} className="text-link">Buka daftar bacaan <span aria-hidden="true">↗</span></Link>
          <div className="sidebar-note"><span className="eyebrow">Sebelum berbagi</span><p>Beri ruang untuk pendapat berbeda. Tandai spoiler. Sebutkan judul dan penulis buku yang kamu bahas.</p></div>
          <p className="sidebar-signature">PTHREE — tempat cerita bertemu.</p>
        </aside>
      </div>
    </div>
  );
}
