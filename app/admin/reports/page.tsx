"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReportItem {
  id: string;
  reason: string;
  createdAt: string;
  reporter: { username: string; name: string };
  post: { id: string; content: string; author: { username: string; name: string } };
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/reports");
    const data = await res.json();
    if (res.ok) setReports(data.reports);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string, status: "RESOLVED" | "DISMISSED") {
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  }

  return (
    <div>
      <h1 className="font-bold text-xl mb-1">Laporan Konten</h1>
      <p className="text-xs text-[#64748b] mb-4">Laporan yang belum ditinjau.</p>

      {loading && <p className="text-[#64748b] text-sm">Memuat...</p>}
      {!loading && reports.length === 0 && <p className="text-[#64748b] text-sm">Tidak ada laporan tertunda.</p>}

      <div className="bg-white border border-[#dce4ed] rounded-2xl divide-y divide-[#dce4ed]">
        {reports.map((r) => (
          <div key={r.id} className="p-4">
            <p className="text-xs text-[#64748b]">
              Dilaporkan oleh <b>@{r.reporter.username}</b> · {new Date(r.createdAt).toLocaleString("id-ID")}
            </p>
            <p className="text-sm mt-1">
              Alasan: <span className="italic">{r.reason}</span>
            </p>
            <Link href={`/post/${r.post.id}`} className="text-xs text-[#2563eb] hover:underline block mt-1">
              Lihat postingan oleh @{r.post.author.username}: &ldquo;{r.post.content.slice(0, 80)}...&rdquo;
            </Link>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => resolve(r.id, "RESOLVED")}
                className="min-h-11 text-xs px-3 py-2 rounded-full bg-blue-50 text-blue-700"
              >
                Tandai Selesai
              </button>
              <button
                onClick={() => resolve(r.id, "DISMISSED")}
                className="min-h-11 text-xs px-3 py-2 rounded-full bg-slate-100 text-[#64748b]"
              >
                Abaikan
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
