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
      <p className="text-xs text-gray-500 mb-4">Laporan yang belum ditinjau.</p>

      {loading && <p className="text-gray-400 text-sm">Memuat...</p>}
      {!loading && reports.length === 0 && <p className="text-gray-400 text-sm">Tidak ada laporan tertunda 🎉</p>}

      <div className="bg-white border rounded-xl divide-y">
        {reports.map((r) => (
          <div key={r.id} className="p-3">
            <p className="text-xs text-gray-500">
              Dilaporkan oleh <b>@{r.reporter.username}</b> · {new Date(r.createdAt).toLocaleString("id-ID")}
            </p>
            <p className="text-sm mt-1">
              Alasan: <span className="italic">{r.reason}</span>
            </p>
            <Link href={`/post/${r.post.id}`} className="text-xs text-emerald-700 hover:underline block mt-1">
              Lihat postingan oleh @{r.post.author.username}: &ldquo;{r.post.content.slice(0, 80)}...&rdquo;
            </Link>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => resolve(r.id, "RESOLVED")}
                className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700"
              >
                Tandai Selesai
              </button>
              <button
                onClick={() => resolve(r.id, "DISMISSED")}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600"
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
