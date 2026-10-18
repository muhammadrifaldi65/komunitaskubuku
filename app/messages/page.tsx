"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Person = { id: string; username: string; name: string; isBanned: boolean };
type Message = { id: string; threadId: string; senderId: string; content: string; createdAt: string; readAt: string | null };
type Thread = { id: string; recipient: Person; lastMessage: Message | null; unreadCount: number; updatedAt: string };
type Selection = { id: string | null; recipient: Person; canSend: boolean };
async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json" }, cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gagal memuat pesan");
  return data;
}
function mergeMessages(previous: Message[], incoming: Message[]): Message[] {
  const map = new Map(previous.map((m) => [m.id, m]));
  for (const message of incoming) map.set(message.id, message);
  return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [inboxCursor, setInboxCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [paging, setPaging] = useState(false);
  const selectionRef = useRef<Selection | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const inboxInitialized = useRef(false);

  const loadInbox = useCallback(async (cursor?: string) => {
    const data = await api(`/api/dm${cursor ? `?before=${encodeURIComponent(cursor)}` : ""}`);
    setThreads((old) => {
      const map = new Map(old.map((t) => [t.id, t]));
      for (const thread of data.threads as Thread[]) map.set(thread.id, thread);
      return [...map.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
    });
    setUnread(data.unreadCount);
    if (cursor || !inboxInitialized.current) setInboxCursor(data.nextCursor);
    inboxInitialized.current = true;
  }, []);

  const choose = useCallback((selection: Selection) => {
    if (selection.id && selectionRef.current?.id === selection.id) return;
    selectionRef.current = selection;
    messagesRef.current = [];
    setSelected(selection); setMessages([]); setHistoryCursor(null); setText(""); setError("");
  }, []);

  const openUsername = useCallback(async (value: string) => {
    const data = await api(`/api/dm/recipient?username=${encodeURIComponent(value.trim().replace(/^@/, ""))}`);
    choose({ id: data.threadId, recipient: data.recipient, canSend: data.canSend });
  }, [choose]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try { await loadInbox(); } catch (e) { if (!cancelled) setError((e as Error).message); }
      finally { if (!cancelled) setLoading(false); }
    }
    void refresh();
    const initial = new URLSearchParams(window.location.search).get("username");
    if (initial) void openUsername(initial).catch((e: Error) => { if (!cancelled) setError(e.message); });
    const interval = setInterval(refresh, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [loadInbox, openUsername]);

  const threadId = selected?.id;
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    let busy = false;
    async function refresh() {
      if (busy) return;
      busy = true;
      try {
        const data = await api(`/api/dm/${threadId}`);
        if (cancelled) return;
        let incoming: Message[] = data.messages;
        let cursor = data.nextCursor;
        const known = new Set(messagesRef.current.map((m) => m.id));
        // Catch up without dropping messages when more than one page arrived between polls.
        while (known.size && cursor && !incoming.some((m) => known.has(m.id))) {
          const older = await api(`/api/dm/${threadId}?before=${encodeURIComponent(cursor)}`);
          if (cancelled) return;
          incoming = [...older.messages, ...incoming]; cursor = older.nextCursor;
        }
        if (cancelled) return;
        if (!known.size) setHistoryCursor(cursor);
        const merged = mergeMessages(messagesRef.current, incoming);
        messagesRef.current = merged; setMessages(merged);
        setSelected((old) => old && old.id === threadId ? { ...old, canSend: data.thread.canSend, recipient: data.thread.recipient } : old);
        const latest = incoming.at(-1);
        if (latest && document.visibilityState === "visible") {
          await api(`/api/dm/${threadId}`, { method: "PATCH", body: JSON.stringify({ messageId: latest.id }) });
          if (!cancelled) await loadInbox();
        }
      } catch (e) { if (!cancelled) setError((e as Error).message); }
      finally { busy = false; }
    }
    void refresh();
    const interval = setInterval(refresh, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [threadId, loadInbox]);

  async function olderMessages() {
    if (!selected?.id || !historyCursor) return;
    const selection = selectionRef.current;
    setPaging(true);
    try {
      const data = await api(`/api/dm/${selected.id}?before=${encodeURIComponent(historyCursor)}`);
      if (selectionRef.current !== selection) return;
      messagesRef.current = mergeMessages(messagesRef.current, data.messages);
      setMessages(messagesRef.current); setHistoryCursor(data.nextCursor);
    } catch (e) { setError((e as Error).message); }
    finally { setPaging(false); }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !text.trim() || sending) return;
    const selection = selectionRef.current;
    setSending(true); setError("");
    try {
      const data = await api("/api/dm", { method: "POST", body: JSON.stringify({ username: selected.recipient.username, content: text }) });
      if (selectionRef.current === selection) {
        setText("");
        messagesRef.current = mergeMessages(messagesRef.current, [data.message]);
        setMessages(messagesRef.current);
        if (!selected.id) {
          const next = { ...selected, id: data.message.threadId };
          selectionRef.current = next; setSelected(next);
        }
      }
      await loadInbox();
    } catch (e) { setError((e as Error).message); }
    finally { setSending(false); }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold">Pesan pribadi {unread > 0 && <span className="text-sm text-emerald-700">({unread} belum dibaca)</span>}</h1>
        <Link href="/support" className="text-sm text-emerald-700 underline">Hubungi Customer Service</Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">Kamu hanya dapat mengirim pesan kepada pengguna yang mengikuti kamu.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 text-red-700 p-3 mb-4">{error}</p>}
      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <aside className="bg-white border rounded-xl p-3">
          <form className="flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); setError(""); void openUsername(username).catch((err: Error) => setError(err.message)); }}>
            <input aria-label="Nama pengguna penerima" placeholder="Nama pengguna" value={username} maxLength={100} onChange={(e) => setUsername(e.target.value)} className="border rounded-lg p-2 min-w-0 w-full text-sm" />
            <button disabled={!username.trim()} className="text-emerald-700 disabled:opacity-50 text-sm">Buka</button>
          </form>
          {loading && <p className="text-sm text-gray-500">Memuat...</p>}
          {!loading && !threads.length && <p className="text-sm text-gray-500">Belum ada percakapan.</p>}
          <ul className="space-y-1 max-h-[45vh] md:max-h-[65vh] overflow-y-auto">
            {threads.map((thread) => <li key={thread.id}><button onClick={() => choose({ id: thread.id, recipient: thread.recipient, canSend: false })} aria-current={selected?.id === thread.id ? "true" : undefined} className={`text-left w-full rounded-lg p-3 ${selected?.id === thread.id ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
              <span className="font-semibold text-sm">{thread.recipient.name}</span>
              {thread.unreadCount > 0 && <span className="ml-2 text-xs text-emerald-700">{thread.unreadCount} baru</span>}
              <span className="block text-xs text-gray-500">@{thread.recipient.username}</span>
              <span className="block truncate text-sm text-gray-600">{thread.lastMessage?.content}</span>
            </button></li>)}
          </ul>
          {inboxCursor && <button className="text-sm text-emerald-700 p-2" onClick={() => { void loadInbox(inboxCursor).catch((e: Error) => setError(e.message)); }}>Percakapan lainnya</button>}
        </aside>
        <section aria-label="Percakapan pribadi" className="bg-white border rounded-xl p-4 flex flex-col h-[70vh]">
          {!selected ? <p className="text-gray-500 text-sm m-auto">Pilih percakapan atau masukkan nama pengguna.</p> : <>
            <Link href={`/${encodeURIComponent(selected.recipient.username)}`} className="font-semibold border-b pb-3">{selected.recipient.name} <span className="text-gray-500 font-normal text-sm">@{selected.recipient.username}</span></Link>
            <div className="flex-1 overflow-y-auto py-3 space-y-3" aria-label="Riwayat pesan">
              {historyCursor && <button disabled={paging} onClick={olderMessages} className="block mx-auto text-emerald-700 text-sm disabled:opacity-50">{paging ? "Memuat..." : "Pesan sebelumnya"}</button>}
              {!messages.length && <p className="text-gray-500 text-sm text-center">Belum ada pesan.</p>}
              {messages.map((message) => <div key={message.id} className={`flex ${message.senderId === selected.recipient.id ? "justify-start" : "justify-end"}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 ${message.senderId === selected.recipient.id ? "bg-gray-100" : "bg-emerald-600 text-white"}`}>
                <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                <time dateTime={message.createdAt} className="block text-[10px] opacity-75 mt-1">{new Date(message.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
              </div></div>)}
            </div>
            {!selected.canSend && <p className="text-sm text-amber-800 bg-amber-50 p-2 rounded-lg">Tidak dapat mengirim: penerima harus mengikuti kamu dan kedua akun harus aktif.</p>}
            <form onSubmit={send} className="flex gap-2 border-t pt-3 mt-3">
              <textarea aria-label="Tulis pesan pribadi" placeholder="Tulis pesan..." maxLength={2000} rows={2} value={text} onChange={(e) => setText(e.target.value)} disabled={!selected.canSend || sending} className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50" />
              <button disabled={!selected.canSend || !text.trim() || sending} className="bg-emerald-600 text-white rounded-lg px-4 text-sm disabled:opacity-50">{sending ? "Mengirim..." : "Kirim"}</button>
            </form>
          </>}
        </section>
      </div>
    </div>
  );
}
