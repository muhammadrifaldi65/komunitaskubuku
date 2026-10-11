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
      <p className="text-xs text-gray-500 mb-4">Balas pesan dari pengguna.</p>

      {loading && <p className="text-gray-400 text-sm">Memuat...</p>}
      {!loading && threads.length === 0 && <p className="text-gray-400 text-sm">Belum ada percakapan.</p>}

      <div className="bg-white border rounded-xl divide-y">
        {threads.map((t) => (
          <Link key={t.id} href={`/admin/chat/${t.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50">
            <img
              src={toPublicImageUrl(t.user.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${t.user.name}`}
              className="w-9 h-9 rounded-full object-cover border"
              alt=""
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {t.user.name} <span className="text-gray-400 font-normal">@{t.user.username}</span>
              </p>
              <p className="text-xs text-gray-400 truncate">{t.messages[0]?.content || "Belum ada pesan"}</p>
            </div>
            {!t.isOpen && <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">Ditutup</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
