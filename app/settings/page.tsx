"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toPublicImageUrl } from "@/lib/media-url";

const inputClass = "mt-1 w-full rounded-lg border px-3 py-2 text-sm";
const emptyProfile = { name: "", username: "", bio: "", location: "", website: "", avatarUrl: null as string | null, coverUrl: null as string | null };

export default function SettingsPage() {
  const router = useRouter();
  const { update } = useSession();
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/me", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat profil");
        setProfile({ name: data.user.name, username: data.user.username, bio: data.user.bio || "", location: data.user.location || "", website: data.user.website || "", avatarUrl: data.user.avatarUrl, coverUrl: data.user.coverUrl });
        setLoaded(true);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Gagal memuat profil");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, []);

  async function upload(event: React.ChangeEvent<HTMLInputElement>, field: "avatarUrl" | "coverUrl") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setMessage("");
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
      setError("Gunakan JPEG, PNG, GIF, atau WebP maksimal 6MB"); return;
    }
    setBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Gagal membaca gambar"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base64, fileName: file.name, folder: field === "avatarUrl" ? "avatars" : "covers" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah gambar");
      setProfile((previous) => ({ ...previous, [field]: toPublicImageUrl(data.url) ?? null }));
      setMessage("Pratinjau diperbarui. Simpan perubahan untuk menerapkannya.");
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal mengunggah gambar"); }
    finally { setBusy(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const changingPassword = !!(passwords.current || passwords.next || passwords.confirm);
    if (changingPassword && (!passwords.current || passwords.next.length < 8 || passwords.next !== passwords.confirm)) {
      setError("Isi password lama, password baru minimal 8 karakter, dan konfirmasi yang cocok"); return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, ...(changingPassword ? { currentPassword: passwords.current, newPassword: passwords.next } : {}) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan profil");
      setPasswords({ current: "", next: "", confirm: "" });
      await update({});
      setMessage("Profil berhasil disimpan"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan profil"); }
    finally { setBusy(false); }
  }

  if (loading) return <p role="status" className="py-16 text-center">Memuat profil…</p>;
  return <div className="mx-auto max-w-xl px-4 py-8">
    <h1 className="mb-5 text-xl font-bold">Pengaturan profil</h1>
    {error && <p id="profile-error" role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mb-4 text-sm text-emerald-700">{message}</p>}
    {loaded && <form onSubmit={save} aria-describedby={error ? "profile-error" : undefined} className="space-y-5 rounded-xl border bg-white p-5">
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
        <legend className="sr-only">Informasi profil</legend>
        {([['coverUrl', 'Sampul profil'], ['avatarUrl', 'Foto profil']] as const).map(([field, label]) => <div key={field}>
          {profile[field] ? <img src={toPublicImageUrl(profile[field]) || ""} alt={`Pratinjau ${label.toLowerCase()}`} className={field === 'coverUrl' ? 'mb-3 h-40 w-full rounded-lg object-cover' : 'mb-3 h-20 w-20 rounded-full object-cover'} /> : <p className="mb-2 text-sm text-gray-500">Belum ada {label.toLowerCase()}</p>}
          <label className="block text-sm font-medium" htmlFor={field}>{label}</label>
          <input id={field} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => void upload(event, field)} className="mt-2 block w-full text-sm" />
          {profile[field] && <button type="button" onClick={() => setProfile((previous) => ({ ...previous, [field]: null }))} className="mt-2 text-sm text-red-700 underline">Hapus {label.toLowerCase()}</button>}
        </div>)}
        <p className="text-xs text-gray-500">Gambar maksimal 6MB. Perubahan gambar diterapkan setelah disimpan.</p>
        {([['name', 'Nama', 60], ['username', 'Username', 24], ['location', 'Lokasi', 100], ['website', 'Website', 500]] as const).map(([field, label, max]) => <label key={field} className="block text-sm font-medium" htmlFor={field}>{label}<input id={field} type={field === 'website' ? 'url' : 'text'} value={profile[field]} required={field === 'name' || field === 'username'} minLength={field === 'username' ? 3 : field === 'name' ? 2 : undefined} maxLength={max} onChange={(event) => setProfile((previous) => ({ ...previous, [field]: event.target.value }))} className={inputClass} /></label>)}
        <p className="text-xs text-gray-500">Alamat profil: /{profile.username}. Username unik tanpa membedakan huruf besar dan kecil.</p>
        <label className="block text-sm font-medium" htmlFor="bio">Bio<textarea id="bio" value={profile.bio} maxLength={300} rows={3} onChange={(event) => setProfile((previous) => ({ ...previous, bio: event.target.value }))} className={inputClass} /></label>
        <section className="border-t pt-4"><h2 className="font-semibold">Privasi pesan</h2><p className="mt-2 text-sm text-gray-600">Anda hanya dapat menerima pesan dari orang yang Anda ikuti. Untuk mengirim pesan, penerima harus mengikuti Anda. Aturan ini juga berlaku untuk percakapan lama setelah berhenti mengikuti.</p></section>
        <section className="space-y-3 border-t pt-4"><h2 className="font-semibold">Ubah password</h2><p className="text-xs text-gray-500">Kosongkan semua kolom untuk mempertahankan password.</p>
          {([['current', 'Password lama'], ['next', 'Password baru'], ['confirm', 'Konfirmasi password baru']] as const).map(([field, label]) => <label key={field} htmlFor={`password-${field}`} className="block text-sm font-medium">{label}<input id={`password-${field}`} type="password" autoComplete={field === 'current' ? 'current-password' : 'new-password'} value={passwords[field]} maxLength={field === 'current' ? 200 : 72} onChange={(event) => setPasswords((previous) => ({ ...previous, [field]: event.target.value }))} className={inputClass} /></label>)}
        </section>
        <button type="submit" className="w-full rounded-lg bg-emerald-700 py-2 text-sm font-medium text-white">{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>
      </fieldset>
    </form>}
  </div>;
}
