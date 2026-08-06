"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Gagal memverifikasi");
      return;
    }
    router.push("/login");
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setResending(false);
    if (!res.ok) {
      setError(data.error || "Gagal mengirim ulang");
      return;
    }
    setMessage(data.message);
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-center mb-1">Verifikasi Email</h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Masukkan kode 6 digit yang kami kirim ke email kamu
      </p>

      <form onSubmit={handleVerify} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <input
          required
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-full border rounded-lg px-3 py-3 text-center text-2xl tracking-[0.5em] font-bold"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {message && <p className="text-emerald-600 text-sm">{message}</p>}
        <button
          disabled={loading}
          className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Memverifikasi..." : "Verifikasi"}
        </button>
      </form>

      <button
        onClick={handleResend}
        disabled={resending}
        className="w-full text-center mt-4 text-sm text-emerald-700 hover:underline disabled:opacity-50"
      >
        {resending ? "Mengirim..." : "Kirim ulang kode"}
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
