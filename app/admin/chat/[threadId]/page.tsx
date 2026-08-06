"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

interface Msg {
  id: string;
  content: string;
  isFromAdmin: boolean;
  createdAt: string;
}
interface ThreadDetail {
  id: string;
  isOpen: boolean;
  user: { username: string; name: string };
  messages: Msg[];
}

export default function AdminChatThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/admin/chat/${threadId}`);
    const data = await res.json();
    if (res.ok) setThread(data.thread);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const res = await fetch(`/api/admin/chat/${threadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setSending(false);
    if (res.ok) {
      setText("");
      load();
    }
  }

  async function closeThread() {
    await fetch(`/api/admin/chat/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: false }),
    });
    load();
  }

  if (loading) return <p className="text-gray-400 text-sm">Memuat...</p>;
  if (!thread) return <p className="text-gray-400 text-sm">Percakapan tidak ditemukan.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-bold text-lg">
          {thread.user.name} <span className="text-gray-400 font-normal">@{thread.user.username}</span>
        </h1>
        {thread.isOpen && (
          <button onClick={closeThread} className="text-xs px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200">
            Tutup Percakapan
          </button>
        )}
      </div>

      <div className="bg-white border rounded-xl p-4 h-[60vh] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2">
          {thread.messages.map((m) => (
            <div key={m.id} className={`flex ${m.isFromAdmin ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  m.isFromAdmin ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 mt-3 border-t pt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Balas pesan..."
            className="flex-1 border rounded-full px-3 py-2 text-sm"
          />
          <button
            disabled={sending}
            className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}
