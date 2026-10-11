"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toPublicImageUrl } from "@/lib/media-url";

interface Thread {
  id: string;
  isOpen: boolean;
  updatedAt: string;
  user: { username: string; name: string; avatarUrl?: string | null };
  handledBy?: { username: string; name: string } | null;
  messages: { content: string; isFromAdmin: boolean }[];
}

export default function AdminChatListPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/chat")
      .then((r) => r.json())
      .then((data) => setThreads(data.threads || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-bold text-xl mb-1">Customer Service</h1>
      <p className="text-xs text-[#64748b] mb-4">Balas pesan dari pengguna.</p>

      {loading && <p className="text-[#64748b] text-sm">Memuat...</p>}
      {!loading && threads.length === 0 && <p className="text-[#64748b] text-sm">Belum ada percakapan.</p>}

      <div className="bg-white border border-[#dce4ed] rounded-2xl divide-y divide-[#dce4ed] overflow-hidden">
        {threads.map((t) => (
          <Link key={t.id} href={`/admin/chat/${t.id}`} className="flex min-w-0 items-center gap-3 p-4 hover:bg-slate-50">
            <img
              src={toPublicImageUrl(t.user.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${t.user.name}`}
              className="w-9 h-9 shrink-0 rounded-full object-cover border border-[#dce4ed]"
              alt=""
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {t.user.name} <span className="text-[#64748b] font-normal">@{t.user.username}</span>
              </p>
              <p className="text-xs text-[#64748b] truncate">{t.messages[0]?.content || "Belum ada pesan"}</p>
            </div>
            {!t.isOpen && <span className="shrink-0 text-xs px-2 py-1 bg-slate-100 rounded-full text-[#64748b]">Ditutup</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
