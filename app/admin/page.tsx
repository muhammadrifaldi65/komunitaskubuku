"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalUsers: number;
  bannedUsers: number;
  totalPosts: number;
  takenDownPosts: number;
  pendingReports: number;
  openThreads: number;
}

export default function AdminHomePage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const cards = stats
    ? [
        { label: "Total Pengguna", value: stats.totalUsers, color: "bg-blue-50 text-blue-700" },
        { label: "Akun Dibanned", value: stats.bannedUsers, color: "bg-red-50 text-red-700" },
        { label: "Total Postingan", value: stats.totalPosts, color: "bg-emerald-50 text-emerald-700" },
        { label: "Konten Diturunkan", value: stats.takenDownPosts, color: "bg-orange-50 text-orange-700" },
        { label: "Laporan Menunggu", value: stats.pendingReports, color: "bg-yellow-50 text-yellow-700" },
        { label: "Chat Aktif", value: stats.openThreads, color: "bg-purple-50 text-purple-700" },
      ]
    : [];

  return (
    <div>
      <h1 className="font-bold text-xl mb-4">Ringkasan Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      {!stats && <p className="text-gray-400 text-sm mt-4">Memuat statistik...</p>}
    </div>
  );
}
