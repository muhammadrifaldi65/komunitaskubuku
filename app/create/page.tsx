"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CreatePostPage() {
  const router = useRouter();
  const { status } = useSession();
  const [content, setContent] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "unauthenticated") {
    router.push("/login");
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 6MB");
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim()) {
      setError("Tulis sesuatu dulu ya");
      return;
    }
    setLoading(true);
    try {
      let imageUrl: string | undefined;
      let imageFileId: string | undefined;

      if (imageFile) {
        const base64 = await fileToBase64(imageFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, fileName: imageFile.name, folder: "posts" }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Gagal upload gambar");
        imageUrl = uploadData.url;
        imageFileId = uploadData.fileId;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          imageUrl,
          imageFileId,
          bookTitle: bookTitle || null,
          bookAuthor: bookAuthor || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat post");

      router.push(`/post/${data.post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="bg-white border rounded-xl p-4">
        <h1 className="font-bold text-lg mb-3">Buat Postingan</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            required
            rows={5}
            placeholder="Apa yang sedang kamu baca hari ini?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Judul buku (opsional)"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Penulis (opsional)"
              value={bookAuthor}
              onChange={(e) => setBookAuthor(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="inline-block text-sm text-emerald-700 cursor-pointer hover:underline">
              📷 Tambah gambar
              <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            </label>
            {preview && <img src={preview} alt="" className="mt-2 rounded-lg max-h-64 object-cover border" />}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            disabled={loading}
            className="w-full bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Memposting..." : "Posting"}
          </button>
        </form>
      </div>
    </div>
  );
}
