"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
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

  async function deletePost(p: AdminPost) {
    if (!isAdmin || !window.confirm("Hapus postingan ini secara permanen?")) return;

    const res = await fetch(`/api/admin/posts/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      load();
      return;
    }
    alert((await res.json()).error || "Gagal menghapus postingan");
  }


  return (
    <div>
      <h1 className="font-bold text-xl mb-1">Moderasi Konten</h1>
      <p className="text-xs text-[#64748b] mb-4">
        Admin & Pembina bisa menurunkan atau memulihkan postingan. Admin juga bisa menghapus permanen.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "active", "taken_down"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`min-h-11 text-xs px-3 py-2 rounded-full ${filter === f ? "bg-[#2563eb] text-white" : "bg-slate-100 text-[#64748b]"}`}
          >
            {f === "all" ? "Semua" : f === "active" ? "Aktif" : "Diturunkan"}
          </button>
        ))}
      </div>

      {loading && <p className="text-[#64748b] text-sm">Memuat...</p>}

      <div className="bg-white border border-[#dce4ed] rounded-2xl divide-y divide-[#dce4ed]">
        {posts.map((p) => (
          <div key={p.id} className="p-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
              <div className="min-w-0">
                <Link href={`/post/${p.id}`} className="text-sm hover:underline line-clamp-2">
                  {p.content}
                </Link>
                <p className="text-xs text-[#64748b] mt-1">
                  oleh @{p.author.username} · {new Date(p.createdAt).toLocaleDateString("id-ID")} · {p._count.reports} laporan
                </p>
                {p.isTakenDown && <p className="text-xs text-red-500">Diturunkan: {p.takedownReason}</p>}
              </div>
              <div className="flex flex-wrap shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleTakedown(p)}
                  className={`min-h-11 text-xs px-3 py-2 rounded-full ${
                    p.isTakenDown ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  {p.isTakenDown ? "Pulihkan" : "Turunkan"}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => deletePost(p)}
                    className="min-h-11 text-xs px-3 py-2 rounded-full bg-slate-100 text-[#172335] hover:bg-slate-200"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
