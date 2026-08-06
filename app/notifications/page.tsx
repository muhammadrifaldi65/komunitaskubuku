"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Notif {
  id: string;
  type: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: { username: string; name: string; avatarUrl?: string | null } | null;
}

const ICONS: Record<string, string> = {
  LIKE: "👍",
  COMMENT: "💬",
  FOLLOW: "➕",
  TAKEDOWN: "⚠️",
  CHAT: "💌",
  SYSTEM: "📢",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (res.ok) setItems(data.notifications);
      setLoading(false);
      fetch("/api/notifications", { method: "PATCH" });
    })();
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="font-bold text-lg mb-4">Notifikasi</h1>
      {loading && <p className="text-gray-400 text-sm">Memuat...</p>}
      {!loading && items.length === 0 && <p className="text-gray-400 text-sm">Belum ada notifikasi.</p>}
      <div className="bg-white border rounded-xl divide-y">
        {items.map((n) => (
          <Link
            key={n.id}
            href={n.link || "#"}
            className={`flex items-center gap-3 p-3 hover:bg-gray-50 ${!n.isRead ? "bg-emerald-50/50" : ""}`}
          >
            <span className="text-xl">{ICONS[n.type] || "🔔"}</span>
            <div className="flex-1 text-sm">
              {n.actor && <b>{n.actor.name} </b>}
              {n.message}
              <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString("id-ID")}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
