"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import PostCard, { PostData } from "@/components/PostCard";

export default function BookmarksPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return <p role="status" className="py-20 text-center text-sm text-[var(--muted)]">Memuat markah…</p>;
  if (!session) return <div className="mx-auto max-w-xl px-5 py-20 text-center"><h1 className="text-2xl font-semibold">Markah milikmu</h1><p className="my-4 text-sm text-[var(--muted)]">Masuk untuk membuka postingan yang kamu simpan.</p><Link href="/login?callbackUrl=%2Fbookmarks" className="button-primary">Masuk</Link></div>;
  return <BookmarkList key={session.user.id} />;
}

function BookmarkList() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams();
        if (cursor) query.set("cursor", cursor);
        const res = await fetch(`/api/bookmarks?${query}`, { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat markah");
        if (controller.signal.aborted) return;
        setPosts((previous) => cursor ? [...previous, ...data.posts.filter((post: PostData) => !previous.some((item) => item.id === post.id))] : data.posts);
        setNextCursor(data.nextCursor);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Koneksi terputus. Coba lagi.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [cursor, retry]);

  function removePost(id: string) {
    setPosts((previous) => previous.filter((post) => post.id !== id));
  }

  return <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
    <header className="mb-7 border-b border-[var(--border)] pb-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">Ruang pribadi</p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--ink)]">Markah</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Percakapan yang ingin kamu baca kembali. Hanya kamu yang dapat melihat daftar ini, dari yang terakhir disimpan.</p>
      <Link href="/reading-list" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Mencari daftar buku? Buka Daftar bacaan</Link>
    </header>
    <section aria-label="Postingan tersimpan" aria-busy={loading}>
      {posts.map((post) => <PostCard key={post.id} post={post} onDeleted={removePost} onBookmarkChanged={(id, bookmarked) => { if (!bookmarked) removePost(id); }} />)}
      {loading && <p role="status" className="py-8 text-center text-sm text-[var(--muted)]">Memuat markah…</p>}
      {error && <div role="alert" className="py-6 text-sm text-red-800"><p>{error}</p><button onClick={() => { setLoading(true); setRetry((value) => value + 1); }} className="mt-3 min-h-11 rounded-full border border-[var(--border)] px-4">Coba lagi</button></div>}
      {!loading && !error && !posts.length && <div className="rounded-2xl border border-[var(--border)] bg-white px-6 py-12 text-center"><h2 className="text-xl font-semibold text-[var(--ink)]">Simpan percakapan yang berarti.</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Ketuk ikon markah pada postingan untuk menyimpannya di sini. Markah berbeda dari daftar buku bacaanmu.</p><Link href="/" className="button-primary mt-6 inline-flex">Jelajahi percakapan</Link></div>}
      {!loading && !error && nextCursor && <button onClick={() => { setLoading(true); setCursor(nextCursor); }} className="min-h-11 w-full rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-white">Muat markah lainnya</button>}
    </section>
  </div>;
}
