"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const MAX_CONTENT_LENGTH = 3000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function fileToBase64(file: File): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca. Pilih ulang gambar."));
  reader.onabort = () => reject(new Error("Pembacaan gambar dibatalkan. Pilih ulang gambar."));
  reader.readAsDataURL(file);
  return promise;
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
  const [stage, setStage] = useState<"idle" | "uploading" | "publishing" | "published">("idle");
  const submitting = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = stage !== "idle";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    if (submitting.current) return;
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Gunakan gambar JPEG, PNG, GIF, atau WebP.");
      return;
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      setError(file.size === 0 ? "Gambar tidak boleh kosong." : "Ukuran gambar maksimal 6 MB.");
      return;
    }
    if (file.name.length > 200) {
      setError("Nama file maksimal 200 karakter. Ganti nama file lalu pilih ulang.");
      return;
    }
    setError(null);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function removeImage() {
    if (submitting.current) return;
    setImageFile(null);
    setPreview(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current || status !== "authenticated") return;
    setError(null);
    if (!content.trim() || content.length > MAX_CONTENT_LENGTH) {
      setError("Tulis isi postingan antara 1 dan 3.000 karakter.");
      return;
    }
    submitting.current = true;
    setStage(imageFile ? "uploading" : "publishing");
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
        const uploadData = await uploadRes.json().catch(() => null);
        if (!uploadRes.ok || typeof uploadData?.url !== "string" || typeof uploadData?.fileId !== "string") {
          throw new Error(uploadData?.error || "Gagal mengunggah gambar. Coba lagi.");
        }
        imageUrl = uploadData.url;
        imageFileId = uploadData.fileId;
      }

      setStage("publishing");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl,
          imageFileId,
          bookTitle: bookTitle.trim() || null,
          bookAuthor: bookAuthor.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.post?.id !== "string") {
        throw new Error(data?.error || "Gagal menerbitkan postingan. Coba lagi.");
      }
      setStage("published");
      router.push(`/post/${encodeURIComponent(data.post.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Postingan belum diterbitkan. Coba lagi.");
      submitting.current = false;
      setStage("idle");
    }
  }

  if (status !== "authenticated") {
    return (
      <div className="max-w-2xl rounded-2xl border bg-white p-6 text-sm text-[var(--color-muted)]" role="status">
        {status === "loading" ? "Memuat akun…" : "Mengalihkan ke halaman masuk…"}
      </div>
    );
  }

  return (
    <div className="max-w-2xl text-left">
      <header className="feed-header">
        <h1>Buat postingan</h1>
      </header>
      <p className="mb-5 px-1 text-sm leading-6 text-[var(--color-muted)]">
        Bagikan bacaan, ulasan, atau pertanyaan untuk komunitas.
      </p>
      <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border bg-white" aria-busy={busy}>
        <fieldset disabled={busy} className="min-w-0 space-y-6 p-4 sm:p-6">
          <legend className="sr-only">Draf postingan</legend>
          <div>
            <label htmlFor="post-content" className="mb-2 block text-sm font-semibold">Isi postingan</label>
            <textarea
              id="post-content"
              required
              maxLength={MAX_CONTENT_LENGTH}
              rows={7}
              placeholder="Apa yang sedang kamu baca hari ini?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-describedby="content-count"
              className="block w-full resize-y rounded-xl border px-3 py-3 text-base leading-7 disabled:bg-gray-50"
            />
            <p id="content-count" className="mt-2 text-sm text-[var(--color-muted)]">
              {content.length.toLocaleString("id-ID")} / 3.000 karakter
            </p>
          </div>

          <section aria-labelledby="book-heading" className="border-t pt-5">
            <h2 id="book-heading" className="text-sm font-semibold">Informasi buku <span className="font-normal text-[var(--color-muted)]">(opsional)</span></h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="book-title" className="mb-2 block text-sm">Judul buku</label>
                <input id="book-title" maxLength={200} value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-base disabled:bg-gray-50" />
              </div>
              <div>
                <label htmlFor="book-author" className="mb-2 block text-sm">Penulis</label>
                <input id="book-author" maxLength={200} value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-base disabled:bg-gray-50" />
              </div>
            </div>
          </section>

          <section aria-labelledby="image-heading" className="border-t pt-5">
            <h2 id="image-heading" className="text-sm font-semibold">Gambar <span className="font-normal text-[var(--color-muted)]">(opsional)</span></h2>
            <p id="image-help" className="mt-2 text-sm text-[var(--color-muted)]">JPEG, PNG, GIF, atau WebP. Maksimal 6 MB.</p>
            <label htmlFor="post-image" className="mt-4 mb-2 block text-sm font-medium">{imageFile ? "Ganti gambar" : "Pilih gambar"}</label>
            <input
              ref={fileInput}
              id="post-image"
              type="file"
              accept={IMAGE_TYPES.join(",")}
              aria-describedby="image-help image-selection"
              onChange={onPickImage}
              className="block w-full min-w-0 rounded-lg border p-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-[var(--color-accent)]"
            />
            <p id="image-selection" role="status" className="mt-2 break-all text-sm text-[var(--color-muted)]">
              {imageFile ? `${imageFile.name} (${(imageFile.size / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 2 })} MB)` : "Belum ada gambar dipilih."}
            </p>
            {preview && (
              <div className="mt-4">
                {/* Local object URLs need a native image rather than the remote image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Pratinjau gambar postingan" className="max-h-80 w-full rounded-xl border bg-gray-50 object-contain" />
                <button type="button" onClick={removeImage} className="mt-2 min-h-11 rounded-full px-3 text-sm font-semibold text-[var(--color-accent)] hover:bg-blue-50">Hapus gambar</button>
              </div>
            )}
          </section>
        </fieldset>

        <div className="border-t p-4 sm:px-6">
          {error && <p role="alert" className="mb-4 text-sm leading-6 text-red-700">{error} Draf tetap tersimpan di halaman ini.</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p role="status" className="text-sm text-[var(--color-muted)]">
              {stage === "uploading" ? "Mengunggah gambar…" : stage === "publishing" ? "Menerbitkan postingan…" : stage === "published" ? "Postingan diterbitkan. Membuka postingan…" : "Postingan dapat dilihat semua orang."}
            </p>
            <button type="submit" disabled={busy || !content.trim()} className="button-primary shrink-0">
              {stage === "uploading" ? "Mengunggah…" : stage === "publishing" ? "Menerbitkan…" : stage === "published" ? "Diterbitkan" : "Terbitkan postingan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
