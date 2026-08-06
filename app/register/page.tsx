"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Terjadi kesalahan");
      return;
    }
    router.push(`/verify?email=${encodeURIComponent(form.email)}`);
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-center mb-1">Buat Akun BookClub</h1>
      <p className="text-sm text-gray-500 text-center mb-6">Gabung dengan komunitas pecinta buku</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder="Nama lengkap"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Username (tanpa spasi)"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, "") })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Password (min. 8 karakter)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Memproses..." : "Daftar & Kirim Kode Verifikasi"}
        </button>
      </form>

      <p className="text-sm text-center mt-4 text-gray-500">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-emerald-700 font-medium hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
