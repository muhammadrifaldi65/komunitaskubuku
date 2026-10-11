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
        { label: "Total Pengguna", value: stats.totalUsers },
        { label: "Akun Dibanned", value: stats.bannedUsers },
        { label: "Total Postingan", value: stats.totalPosts },
        { label: "Konten Diturunkan", value: stats.takenDownPosts },
        { label: "Laporan Menunggu", value: stats.pendingReports },
        { label: "Chat Aktif", value: stats.openThreads },
      ]
    : [];

  return (
    <div>
      <h1 className="font-bold text-xl mb-4">Ringkasan Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="min-w-0 rounded-2xl border border-[#dce4ed] bg-white p-4">
            <p className="text-2xl font-bold text-[#2563eb]">{c.value}</p>
            <p className="text-xs mt-1 text-[#64748b]">{c.label}</p>
          </div>
        ))}
      </div>
      {!stats && <p className="text-[#64748b] text-sm mt-4">Memuat statistik...</p>}
    </div>
  );
}
