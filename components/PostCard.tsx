"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toPublicImageUrl } from "@/lib/media-url";
export interface PostAuthor {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  role: "ADMIN" | "PEMBINA" | "USER";
}

export interface PostData {
  id: string;
  content: string;
  imageUrl?: string | null;
  bookTitle?: string | null;
  bookAuthor?: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  shareCount: number;
  author: PostAuthor;
  myReaction?: "LIKE" | "DISLIKE" | null;
  isBookmarked?: boolean;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
  return `${Math.floor(diff / 86400)}h`;
}


function IconThumbUp({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
      <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4.5-8a2 2 0 0 1 3.5 1.3V9h4.2a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 18 20H7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconThumbDown({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
      <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3Zm0 0-4.5 8a2 2 0 0 1-3.5-1.3V15H4.8a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 6 4h11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconComment() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 5h16v11H8l-4 4V5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconShare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M16 6l-4-4-4 4M12 2v14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBookmark({ filled }: { filled?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconMore() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export default function PostCard({ post, onDeleted, onBookmarkChanged }: { post: PostData; onDeleted?: (id: string) => void; onBookmarkChanged?: (id: string, bookmarked: boolean) => void }) {
  const { data: session } = useSession();
  const [state, setState] = useState(post);
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const bookmarkRequest = useRef(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [bookmarkError, setBookmarkError] = useState("");

  async function deletePost() {
    if (deleting || !window.confirm("Hapus postingan ini beserta komentar dan reaksinya? Tindakan ini permanen dan tidak dapat dibatalkan.")) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/posts/${state.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gagal menghapus postingan. Coba lagi.");
      }
      setDeleted(true);
      onDeleted?.(state.id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Koneksi terputus. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  async function react(type: "LIKE" | "DISLIKE") {
    if (!session) return (window.location.href = "/login");
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${state.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        setState((s) => ({ ...s, likeCount: data.likeCount, dislikeCount: data.dislikeCount, myReaction: data.myReaction }));
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleBookmark() {
    if (!session) return (window.location.href = "/login");
    if (bookmarkRequest.current) return;
    bookmarkRequest.current = true;
    setBookmarkBusy(true);
    setBookmarkError("");
    try {
      const res = await fetch(`/api/posts/${state.id}/bookmark`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarked: !state.isBookmarked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan markah. Coba lagi.");
      setState((s) => ({ ...s, isBookmarked: data.bookmarked }));
      onBookmarkChanged?.(state.id, data.bookmarked);
    } catch (error) {
      setBookmarkError(error instanceof Error ? error.message : "Koneksi terputus. Coba lagi.");
    } finally {
      bookmarkRequest.current = false;
      setBookmarkBusy(false);
    }
  }

  async function share() {
    const res = await fetch(`/api/posts/${state.id}/share`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setState((s) => ({ ...s, shareCount: data.shareCount }));
    const url = `${window.location.origin}/post/${state.id}`;
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert("Tautan post disalin ke clipboard!");
    }
  }

  async function submitReport() {
    if (!session) return (window.location.href = "/login");
    if (!reportReason.trim()) return;
    const res = await fetch(`/api/posts/${state.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason }),
    });
    if (res.ok) {
      alert("Laporan terkirim. Terima kasih!");
      setShowReport(false);
      setReportReason("");
    }
  }

  const canDelete = session?.user.id === state.author.id || session?.user.role === "ADMIN";
  const imageUrl = toPublicImageUrl(state.imageUrl);
  const actionClass = "inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2 text-xs transition hover:bg-slate-100 disabled:opacity-50";

  if (deleted) return null;

  return (
    <article className="post-card mb-4 rounded-2xl border border-[var(--border)] bg-white p-4 text-[var(--ink)] sm:p-5" aria-busy={deleting}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/profile/${state.author.username}`} className="flex min-w-0 items-center gap-2.5">
          <img src={toPublicImageUrl(state.author.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(state.author.name)}`} className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] object-cover" alt="" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold">{state.author.name}</span>
              {state.author.role !== "USER" && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">{state.author.role === "ADMIN" ? "Admin" : "Pembina"}</span>}
            </div>
            <p className="mt-0.5 break-words text-xs text-[var(--muted)]">@{state.author.username} · {timeAgo(state.createdAt)}</p>
          </div>
        </Link>
        <button type="button" onClick={() => setShowOptions((value) => !value)} className={`${actionClass} shrink-0 text-[var(--muted)]`} aria-label="Opsi postingan" aria-expanded={showOptions} aria-controls={`post-options-${state.id}`} disabled={deleting}><IconMore /></button>
      </div>

      {showOptions && <div id={`post-options-${state.id}`} className="mt-3 flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-2" onKeyDown={(event) => { if (event.key === "Escape") setShowOptions(false); }}>
        {canDelete && <button type="button" onClick={deletePost} disabled={deleting} className="min-h-10 rounded-full px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">{deleting ? "Menghapus…" : "Hapus postingan"}</button>}
        <button type="button" onClick={() => { setShowReport((value) => !value); setShowOptions(false); }} disabled={deleting} className="min-h-10 rounded-full px-3 text-sm text-[var(--muted)] hover:bg-slate-100">Laporkan postingan</button>
      </div>}
      {deleteError && <p role="alert" className="mt-3 text-sm text-red-600">{deleteError}</p>}
      {deleting && <p role="status" className="mt-2 text-xs text-[var(--muted)]">Menghapus postingan…</p>}

      {(state.bookTitle || state.bookAuthor) && <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-3 py-2.5 text-sm">
        <p className="mb-1 text-xs font-medium text-blue-600">Sedang dibahas</p>
        <p className="font-medium">{state.bookTitle}{state.bookAuthor ? ` — ${state.bookAuthor}` : ""}</p>
      </div>}

      <Link href={`/post/${state.id}`}>
        <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7">{state.content}</p>
        {imageUrl && <img src={imageUrl} alt="Gambar postingan" className="mt-3 max-h-[480px] w-full rounded-xl border border-[var(--border)] object-cover" />}
      </Link>

      {showReport && <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-3 text-sm">
        <label htmlFor={`report-${state.id}`} className="mb-2 block font-medium">Laporkan postingan ini</label>
        <input id={`report-${state.id}`} value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Jelaskan alasannya..." className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm" />
        <button type="button" onClick={submitReport} className="mt-2 min-h-10 rounded-full px-3 text-sm font-medium text-blue-600">Kirim laporan</button>
      </div>}

      <div className="mt-4 flex items-center justify-between gap-1 border-t border-[var(--border)] pt-2 text-[var(--muted)]">
        <button onClick={() => react("LIKE")} disabled={busy || deleting} aria-label="Suka post" aria-pressed={state.myReaction === "LIKE"} className={`${actionClass} ${state.myReaction === "LIKE" ? "text-blue-600" : ""}`}><IconThumbUp filled={state.myReaction === "LIKE"} /><span>{state.likeCount}</span></button>
        <button onClick={() => react("DISLIKE")} disabled={busy || deleting} aria-label="Tidak suka post" aria-pressed={state.myReaction === "DISLIKE"} className={`${actionClass} ${state.myReaction === "DISLIKE" ? "text-blue-600" : ""}`}><IconThumbDown filled={state.myReaction === "DISLIKE"} /><span>{state.dislikeCount}</span></button>
        <Link href={`/post/${state.id}`} aria-label={`${state.commentCount} komentar`} className={actionClass}><IconComment /><span>{state.commentCount}</span></Link>
        <button onClick={share} disabled={deleting} aria-label="Bagikan post" className={actionClass}><IconShare /><span>{state.shareCount}</span></button>
        <button onClick={toggleBookmark} disabled={deleting || bookmarkBusy} aria-label={bookmarkBusy ? "Menyimpan markah…" : state.isBookmarked ? "Hapus dari Markah" : "Simpan ke Markah"} aria-pressed={!!state.isBookmarked} className={`${actionClass} ${state.isBookmarked ? "text-blue-600" : ""}`}><IconBookmark filled={state.isBookmarked} /></button>
      </div>
      {bookmarkError && <p role="alert" className="mt-2 text-sm text-red-600">{bookmarkError}</p>}
    </article>
  );
}