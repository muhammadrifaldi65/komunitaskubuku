"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminPost {
  id: string;
  content: string;
  isTakenDown: boolean;
  takedownReason?: string | null;
  createdAt: string;
  author: { username: string; name: string };
  _count: { reports: number };
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "taken_down">("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const url = new URL("/api/admin/posts", window.location.origin);
    if (filter !== "all") url.searchParams.set("status", filter);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (res.ok) setPosts(data.posts);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function toggleTakedown(p: AdminPost) {
    const action = p.isTakenDown ? "RESTORE" : "TAKEDOWN";
    let reason: string | undefined;
    if (action === "TAKEDOWN") reason = prompt("Alasan takedown:") || undefined;

    const res = await fetch(`/api/admin/posts/${p.id}/takedown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    if (res.ok) load();
  }

  return (
    <div>
      <h1 className="font-bold text-xl mb-1">Moderasi Konten</h1>
      <p className="text-xs text-gray-500 mb-4">Admin & Pembina bisa menurunkan atau memulihkan postingan.</p>

      <div className="flex gap-2 mb-4">
        {(["all", "active", "taken_down"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full ${filter === f ? "bg-emerald-600 text-white" : "bg-gray-100"}`}
          >
            {f === "all" ? "Semua" : f === "active" ? "Aktif" : "Diturunkan"}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400 text-sm">Memuat...</p>}

      <div className="bg-white border rounded-xl divide-y">
        {posts.map((p) => (
          <div key={p.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/post/${p.id}`} className="text-sm hover:underline line-clamp-2">
                  {p.content}
                </Link>
                <p className="text-xs text-gray-400 mt-1">
                  oleh @{p.author.username} · {new Date(p.createdAt).toLocaleDateString("id-ID")} · {p._count.reports} laporan
                </p>
                {p.isTakenDown && <p className="text-xs text-red-500">Diturunkan: {p.takedownReason}</p>}
              </div>
              <button
                onClick={() => toggleTakedown(p)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full ${
                  p.isTakenDown ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}
              >
                {p.isTakenDown ? "Pulihkan" : "Turunkan"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
