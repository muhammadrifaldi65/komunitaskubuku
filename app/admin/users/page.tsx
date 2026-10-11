"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toPublicImageUrl } from "@/lib/media-url";

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "ADMIN" | "PEMBINA" | "USER";
  isBanned: boolean;
  banReason?: string | null;
  avatarUrl?: string | null;
  _count: { posts: number };
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState({ username: "", email: "", password: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    if (res.ok) setUsers(data.users);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function banToggle(u: AdminUser) {
    if (!isAdmin) return;
    const action = u.isBanned ? "UNBAN" : "BAN";
    let banReason: string | undefined;
    if (action === "BAN") {
      banReason = prompt("Alasan ban (opsional):") || undefined;
    }
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, banReason }),
    });
    if (res.ok) load();
    else alert((await res.json()).error);
  }

  async function changeRole(u: AdminUser, role: string) {
    if (!isAdmin) return;
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CHANGE_ROLE", role }),
    });
    if (res.ok) load();
    else alert((await res.json()).error);
  }

  async function deleteUser(u: AdminUser) {
    if (!isAdmin || u.id === session?.user.id || !window.confirm(`Hapus akun @${u.username} secara permanen?`)) return;

    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (res.ok) {
      load();
      return;
    }
    alert((await res.json()).error || "Gagal menghapus akun");
  }


  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setCreateError(null);
    setCreating(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setCreateError(data.error || "Gagal membuat akun");
      return;
    }

    setCreateForm({ username: "", email: "", password: "" });
    await load();
  }


  return (
    <div>
      <h1 className="font-bold text-xl mb-1">Kelola Pengguna</h1>
      <p className="text-xs text-gray-500 mb-4">
        {isAdmin
          ? "Buat akun pengguna dari sini. Registrasi publik dinonaktifkan."
          : "Kamu (Pembina) hanya bisa melihat data pengguna."}
      </p>

      {isAdmin && (
        <form onSubmit={createUser} className="mb-5 rounded-xl border bg-white p-4 space-y-3">
          <h2 className="font-semibold">Buat akun pengguna</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              required
              minLength={3}
              maxLength={24}
              placeholder="Username"
              value={createForm.username}
              onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.replace(/\s/g, "") })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              required
              minLength={8}
              type="password"
              placeholder="Password (min. 8 karakter)"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            disabled={creating}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {creating ? "Membuat..." : "Buat akun"}
          </button>
        </form>

      )}

      <div className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Cari nama/username/email..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button onClick={load} className="px-4 border rounded-lg text-sm hover:bg-gray-50">
          Cari
        </button>
      </div>

      {loading && <p className="text-gray-400 text-sm">Memuat...</p>}

      <div className="bg-white border rounded-xl divide-y">
        {users.map((u) => (
          <div key={u.id} className="p-3 flex items-center gap-3">
            <img
              src={toPublicImageUrl(u.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
              className="w-9 h-9 rounded-full object-cover border"
              alt=""
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {u.name} <span className="text-gray-400 font-normal">@{u.username}</span>
              </p>
              <p className="text-xs text-gray-400 truncate">{u.email}</p>
              {u.isBanned && <p className="text-xs text-red-500">Dibanned: {u.banReason}</p>}
            </div>

            <select
              value={u.role}
              disabled={!isAdmin}
              onChange={(e) => changeRole(u, e.target.value)}
              className="text-xs border rounded-lg px-2 py-1 disabled:opacity-50"
            >
              <option value="USER">User</option>
              <option value="PEMBINA">Pembina</option>
              <option value="ADMIN">Admin</option>
            </select>

            <button
              onClick={() => banToggle(u)}
              disabled={!isAdmin}
              className={`text-xs px-3 py-1.5 rounded-full disabled:opacity-40 ${
                u.isBanned ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-600"
              }`}
            >
              {u.isBanned ? "Buka Ban" : "Ban"}
            </button>
            {isAdmin && (
              <button
                onClick={() => deleteUser(u)}
                disabled={u.id === session?.user.id}
                title={u.id === session?.user.id ? "Tidak bisa menghapus akun sendiri" : "Hapus akun"}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40"
              >
                Hapus
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
