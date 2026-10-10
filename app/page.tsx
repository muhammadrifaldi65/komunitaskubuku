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

  async function load(initial = false) {
    setLoading(true);
    const url = new URL("/api/posts", window.location.origin);
    if (!initial && cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (res.ok) {
      setPosts((prev) => (initial ? data.posts : [...prev, ...data.posts]));
      setCursor(data.nextCursor);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="mb-4 bg-white border rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-lg">Beranda</h1>
          <p className="text-xs text-gray-500">Diurutkan otomatis berdasarkan aktivitas & minatmu</p>
        </div>
        {session ? (
          <Link
            href="/create"
            className="w-full sm:w-auto inline-flex justify-center px-3 py-1.5 bg-emerald-600 text-white rounded-full text-sm hover:bg-emerald-700"
          >
            + Tulis Post
          </Link>
        ) : (
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex justify-center px-3 py-1.5 bg-emerald-600 text-white rounded-full text-sm hover:bg-emerald-700"
          >
            Masuk untuk bergabung
          </Link>
        )}
      </div>

      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}

      {loading && <p className="text-center text-gray-400 text-sm py-4">Memuat...</p>}
      {!loading && posts.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-8">Belum ada postingan. Jadilah yang pertama menulis!</p>
      )}
      {!loading && cursor && (
        <button onClick={() => load(false)} className="w-full py-2 text-sm text-emerald-700 hover:underline">
          Muat lebih banyak
        </button>
      )}
    </div>
  );
}
