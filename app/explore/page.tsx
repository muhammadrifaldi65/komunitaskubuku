"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FeedResults from "@/components/FeedResults";
import TrendingHashtags from "@/components/TrendingHashtags";

export default function ExplorePage() {
  return <Suspense fallback={<p role="status" className="feed-loading">Memuat Jelajahi…</p>}><ExploreContent /></Suspense>;
}

function ExploreContent() {
  const params = useSearchParams();
  const initial = params.get("q")?.slice(0, 100) || "";
  const [query, setQuery] = useState(initial);
  const [search, setSearch] = useState(initial.trim());
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 450);
    return () => clearTimeout(timer);
  }, [query]);
  return <div className="feed-layout">
    <section className="feed-column" aria-label="Jelajahi komunitas">
      <header className="feed-header"><div><h1>Jelajahi</h1><span>Temukan percakapan dan bacaan yang sedang ramai</span></div></header>
      <form className="feed-search" role="search" onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></svg>
        <input aria-label="Cari post, judul buku, penulis, atau hashtag" placeholder="Cari post, buku, atau #hashtag" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} />
        {query && <button type="button" onClick={() => { setQuery(""); setSearch(""); }} aria-label="Hapus pencarian">Hapus</button>}
      </form>
      {!query.trim() ? <TrendingHashtags onSelect={(tag) => { setQuery(`#${tag}`); setSearch(`#${tag}`); }} /> : search === query.trim() ? <><p className="search-summary">Hasil untuk <strong>“{search}”</strong></p><FeedResults key={search} feed="all" search={search} signedIn={false} /></> : <p role="status" className="feed-loading">Mencari…</p>}
    </section>
    <aside className="discovery-column" aria-label="Tentang Jelajahi"><section className="sidebar-widget"><h2>Temukan bacaan baru</h2><p>Cari judul, penulis, isi post, atau ketuk hashtag yang sedang ramai.</p></section></aside>
  </div>;
}
