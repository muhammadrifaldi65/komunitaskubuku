"use client";

import { useEffect, useState } from "react";

interface Item {
  id: string;
  bookTitle: string;
  bookAuthor?: string | null;
  status: "WANT_TO_READ" | "READING" | "FINISHED";
}

const STATUS_LABEL: Record<string, string> = {
  WANT_TO_READ: "Ingin Dibaca",
  READING: "Sedang Dibaca",
  FINISHED: "Selesai",
};

export default function ReadingListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/reading-list");
    const data = await res.json();
    if (res.ok) setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/reading-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookTitle: title, bookAuthor: author || null }),
    });
    if (res.ok) {
      setTitle("");
      setAuthor("");
      load();
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/reading-list/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/reading-list/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="font-bold text-lg mb-1">📖 Reading List</h1>
      <p className="text-xs text-gray-500 mb-4">Catat buku yang ingin, sedang, dan sudah kamu baca</p>

      <form onSubmit={add} className="bg-white border rounded-xl p-4 mb-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul buku"
            className="w-full min-w-0 border rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Penulis (opsional)"
            className="w-full min-w-0 border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          Tambah
        </button>
      </form>

      {loading && <p className="text-gray-400 text-sm">Memuat...</p>}
      {!loading && items.length === 0 && <p className="text-gray-400 text-sm">Daftar bacaanmu masih kosong.</p>}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white border rounded-xl p-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">{item.bookTitle}</p>
              {item.bookAuthor && <p className="text-xs text-gray-500 truncate">{item.bookAuthor}</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-[auto_auto] sm:items-center sm:justify-end">
              <select
                value={item.status}
                  onChange={(e) => updateStatus(item.id, e.target.value)}
                  className="w-full sm:w-auto text-xs border rounded-lg px-2 py-1"
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(item.id)}
                className="w-full sm:w-auto text-center text-red-500 text-xs font-medium hover:underline"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
