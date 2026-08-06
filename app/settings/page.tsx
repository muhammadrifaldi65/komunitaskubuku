"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (res.ok) {
        setName(data.user.name);
        setBio(data.user.bio || "");
        setAvatarUrl(data.user.avatarUrl);
      }
      setLoading(false);
    })();
  }, []);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, fileName: file.name, folder: "avatars" }),
      });
      const data = await res.json();
      if (res.ok) setAvatarUrl(data.url);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setMessageType(null);

    if (newPassword || confirmNewPassword || currentPassword) {
      if (newPassword !== confirmNewPassword) {
        setMessage("Password baru tidak cocok");
        setMessageType("error");
        setSaving(false);
        return;
      }
      if (newPassword && newPassword.length < 8) {
        setMessage("Password baru minimal 8 karakter");
        setMessageType("error");
        setSaving(false);
        return;
      }
    }

    const body: Record<string, unknown> = { name, bio, avatarUrl };
    if (currentPassword && newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    const data = await res.json();
    if (res.ok) {
      setMessage("Profil berhasil disimpan");
      setMessageType("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      router.refresh();
    } else {
      setMessage(data.error || "Terjadi kesalahan");
      setMessageType("error");
    }
  }

  if (loading) return <p className="text-center text-gray-400 text-sm py-16">Memuat...</p>;

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <h1 className="font-bold text-lg mb-4">Pengaturan Profil</h1>
      <form onSubmit={handleSave} className="space-y-3 bg-white border rounded-xl p-4">
        <div className="flex flex-col items-center gap-2">
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`}
            className="w-20 h-20 rounded-full object-cover border"
            alt=""
          />
          <label className="text-xs text-emerald-700 cursor-pointer hover:underline">
            Ganti foto profil
            <input type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
          </label>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Bio singkat"
          rows={3}
          maxLength={300}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
        />
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <h2 className="font-semibold text-sm">Ubah Password</h2>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Password lama"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Password baru (min 8 karakter)"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Konfirmasi password baru"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {message && (
          <p className={messageType === "error" ? "text-red-600 text-sm" : "text-emerald-600 text-sm"}>
            {message}
          </p>
        )}
        <button
          disabled={saving}
          className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
