"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PostCard, { PostData } from "@/components/PostCard";
export default function FeedResults({ feed, search, signedIn }: { feed: "all" | "following"; search: string; signedIn: boolean }) {
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

