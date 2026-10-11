"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import PostCard, { PostData } from "@/components/PostCard";
import { toPublicImageUrl } from "@/lib/media-url";

export default function HomePage() {
  return <Suspense fallback={<p role="status" className="feed-loading">Memuat ruang baca…</p>}><HomeContent /></Suspense>;
}

function HomeContent() {
  const { data: session, status } = useSession();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [search, setSearch] = useState(params.get("q") || "");
  const [feed, setFeed] = useState<"all" | "following">("all");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (params.has("search")) input.current?.focus(); }, [params]);
  return <div className="feed-layout">
    <section className="feed-column" aria-label="Feed komunitas">
      <header className="feed-header"><div><h1>Ruang baca</h1><span>Cerita baru dari komunitas</span></div><Link href={session ? "/create" : "/login"} className="icon-link" aria-label="Tulis post">+</Link></header>
      <form className="feed-search" role="search" onSubmit={(event) => {event.preventDefault();setSearch(query.trim());}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></svg>
        <input ref={input} aria-label="Cari post, judul buku, atau penulis" placeholder="Cari post, buku, atau penulis" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="submit">Cari</button>
      </form>
      <nav className="feed-tabs" aria-label="Pilihan feed"><button aria-current={feed === "all" ? "page" : undefined} onClick={() => setFeed("all")}>Untukmu</button><button aria-current={feed === "following" ? "page" : undefined} onClick={() => setFeed("following")}>Mengikuti</button></nav>
      {search && <div className="search-summary"><p>Hasil untuk <strong>“{search}”</strong></p><button onClick={() => {setQuery("");setSearch("");}}>Hapus pencarian</button></div>}
      {session && !search && <Link href="/create" className="feed-composer"><img src={toPublicImageUrl(session.user.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.user.name || "Pembaca")}`} alt="" width={40} height={40} /><span>Ada bacaan menarik hari ini?</span><span className="composer-plus" aria-hidden="true">+</span></Link>}
      {status === "loading" ? <p role="status" className="feed-loading">Memuat ruang baca…</p> : feed === "following" && !session ? <div className="feed-empty"><h2>Ikuti pembaca favoritmu</h2><p>Masuk untuk melihat post dari orang yang kamu ikuti.</p><Link className="button-primary" href="/login">Masuk</Link></div> : <FeedResults key={`${feed}:${search}:${session?.user.id || "guest"}`} feed={feed} search={search} signedIn={!!session} />}
    </section>
    <aside className="discovery-column" aria-label="Panduan komunitas">
      <section className="sidebar-widget"><span className="section-label">Ruang untuk semua pembaca</span><h2>Bacaan berikutnya bisa dimulai dari sini.</h2><p>Ulasan singkat, kutipan favorit, atau pertanyaan yang belum menemukan jawaban.</p><Link href={session ? "/create" : "/login"} className="button-primary">Bagikan cerita</Link></section>
      <section className="sidebar-widget"><h2>Rak pribadimu</h2><p>Catat buku yang ingin dibaca. Simpan post yang ingin kamu kunjungi lagi.</p><Link href={session ? "/reading-list" : "/login"} className="sidebar-row"><span>Daftar bacaan</span><span aria-hidden="true">↗</span></Link><Link href={session ? `/profile/${session.user.username}` : "/login"} className="sidebar-row"><span>Profil & teman baca</span><span aria-hidden="true">↗</span></Link></section>
      <section className="community-note"><h2>Percakapan yang nyaman</h2><p>Hargai pendapat berbeda. Beri tanda spoiler. Sertakan judul dan penulis saat membahas buku.</p><span>PTHREE · Komunitas pecinta buku</span></section>
    </aside>
  </div>;
}
function FeedResults({ feed, search, signedIn }: { feed: "all" | "following"; search: string; signedIn: boolean }) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const pending = useRef(false);
  async function load(after: string | null = null) {
    if (pending.current) return;
    pending.current = true;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({feed});
      if (search) query.set("q", search);
      if (after) query.set("cursor", after);
      const response = await fetch(`/api/posts?${query}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Feed belum dapat dimuat.");
      if (!controller.signal.aborted) {
        setPosts((current) => after ? [...current, ...data.posts] : data.posts);
        setCursor(data.nextCursor);
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Koneksi terputus. Coba lagi.");
    } finally {
      if (!controller.signal.aborted) { setLoading(false); pending.current = false; }
    }
  }
  useEffect(() => {
    void load();
    return () => { request.current?.abort(); pending.current = false; };
    // The component remounts when the query, feed, or viewer changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="feed-results">
    {posts.map((post) => <PostCard key={post.id} post={post} onDeleted={(id) => setPosts((current) => current.filter((item) => item.id !== id))} />)}
    {loading && <p className="feed-loading" role="status">Memuat percakapan…</p>}
    {error && <div className="feed-empty" role="alert"><h2>Belum bisa memuat post</h2><p>{error}</p><button className="button-primary" onClick={() => load(cursor)}>Coba lagi</button></div>}
    {!loading && !error && !posts.length && <div className="feed-empty"><h2>{search ? "Belum ada hasil" : feed === "following" ? "Lingkaran bacamu masih sepi" : "Mulai percakapan pertama"}</h2><p>{search ? "Coba kata lain, judul buku, atau nama penulis." : feed === "following" ? "Ikuti pembaca lewat profil mereka. Post terbarunya akan muncul di sini." : "Bagikan buku yang sedang kamu baca dengan komunitas."}</p>{!search && feed === "all" && <Link href={signedIn ? "/create" : "/login"} className="button-primary">Tulis post</Link>}</div>}
    {!loading && !error && cursor && <button className="load-more" onClick={() => load(cursor)}>Muat lebih banyak</button>}
  </div>;
}
