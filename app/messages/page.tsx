"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  id: string;
  content: string;
  isFromAdmin: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/chat");
    const data = await res.json();
    if (res.ok) setMessages(data.thread?.messages || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const res = await fetch("/api/chat", {
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

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="font-bold text-lg mb-1">Pesan Customer Service</h1>
      <p className="text-xs text-gray-500 mb-4">Tim kami akan membalas secepatnya</p>

      <div className="bg-white border rounded-xl p-4 h-[60vh] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && <p className="text-gray-400 text-sm">Memuat...</p>}
          {!loading && messages.length === 0 && (
            <p className="text-gray-400 text-sm text-center mt-10">
              Belum ada percakapan. Sampaikan pertanyaan atau kendalamu di bawah.
            </p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.isFromAdmin ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  m.isFromAdmin ? "bg-gray-100 text-gray-800" : "bg-emerald-600 text-white"
                }`}
              >
                {m.content}
                <div className={`text-[10px] mt-0.5 ${m.isFromAdmin ? "text-gray-400" : "text-emerald-100"}`}>
                  {new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex gap-2 mt-3 border-t pt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis pesan..."
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
