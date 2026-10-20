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
  LIKE: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  COMMENT: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z",
  FOLLOW: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10-3v6m-3-3h6",
  TAKEDOWN: "M12 3 2 21h20L12 3Zm0 7v4m0 3h.01",
  CHAT: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z",
  SYSTEM: "M3 10v4h4l10 5V5L7 10H3Zm4 4 1 6h3l-1-5m8-6a4 4 0 0 1 0 6",
};
const bellPath = "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4";

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
            <svg className="shrink-0 text-blue-600" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[n.type] || bellPath} /></svg>
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
