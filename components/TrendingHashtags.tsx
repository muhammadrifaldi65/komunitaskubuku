"use client";

import { useEffect, useState } from "react";

export default function TrendingHashtags({ onSelect }: { onSelect: (tag: string) => void }) {
  const [trends, setTrends] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/trending", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat trending.");
        setTrends(data.trends);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Koneksi terputus.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  return <section aria-label="Hashtag trending" className="border-b p-4">
    <h2 className="font-semibold">Sedang ramai</h2>
    <p className="text-sm text-gray-500 mb-3">Hashtag populer dalam 24 jam terakhir</p>
    {loading ? <p role="status">Memuat trending…</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="underline" onClick={() => setAttempt((value) => value + 1)}>Coba lagi</button></div> : trends.length ? <ol className="space-y-1">{trends.map(({ tag, count }, index) => <li key={tag}><button type="button" className="w-full text-left rounded-lg p-2 hover:bg-gray-50 focus-visible:outline-2" onClick={() => onSelect(tag)}><span className="text-xs text-gray-500">{index + 1} · Trending</span><strong className="block">#{tag}</strong><span className="text-xs text-gray-500">{count.toLocaleString("id-ID")} post</span></button></li>)}</ol> : <p className="text-sm text-gray-500">Belum ada hashtag dalam 24 jam terakhir.</p>}
  </section>;
}
