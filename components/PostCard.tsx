"use client";

import Link from "next/link";
import { useState } from "react";
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

/* Spine tab color by role — a small nod to color-coded library spines */
const SPINE: Record<PostAuthor["role"], string> = {
  ADMIN: "#A13D2E",
  PEMBINA: "#B8863B",
  USER: "#1F4D3A",
};

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

export default function PostCard({ post }: { post: PostData }) {
  const { data: session } = useSession();
  const [state, setState] = useState(post);
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");

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
    const res = await fetch(`/api/posts/${state.id}/bookmark`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setState((s) => ({ ...s, isBookmarked: data.bookmarked }));
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

  const spine = SPINE[state.author.role];
  const imageUrl = toPublicImageUrl(state.imageUrl);

  return (
    <article className="post-card">
      <div className="flex items-center justify-between">
        <Link href={`/profile/${state.author.username}`} className="flex items-center gap-2.5">
          <img
            src={toPublicImageUrl(state.author.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${state.author.name}`}
            className="w-9 h-9 rounded-full object-cover ring-1"
            style={{ boxShadow: "0 0 0 1px #E4E0D6" }}
            alt=""
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm" style={{ color: "#1C1B19" }}>
                {state.author.name}
              </span>
              {state.author.role !== "USER" && (
                <span
                  className="text-[9px] px-1.5 py-0.5 uppercase tracking-widest rounded-[2px] border"
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    color: spine,
                    borderColor: spine,
                  }}
                >
                  {state.author.role === "ADMIN" ? "Admin" : "Pembina"}
                </span>
              )}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ fontFamily: "var(--font-mono, monospace)", color: "#8A8478" }}
            >
              @{state.author.username} · {timeAgo(state.createdAt)}
            </div>
          </div>
        </Link>
        <button
          onClick={() => setShowReport((s) => !s)}
          className="p-1.5 rounded-sm"
          style={{ color: "#8A8478" }}
          aria-label="Opsi lainnya"
        >
          <IconMore />
        </button>
      </div>

      {(state.bookTitle || state.bookAuthor) && (
        <div
          className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm px-3 py-2.5 border-l-2 rounded-[2px]"
          style={{ background: "#FBFAF7", borderColor: "#B8863B", color: "#5C5648" }}
        >
          <span
            className="uppercase tracking-widest text-[9px]"
            style={{ fontFamily: "var(--font-mono, monospace)", color: "#B8863B" }}
          >
            Sedang dibahas
          </span>
          <span style={{ fontFamily: "var(--font-display, serif)" }} className="italic">
            {state.bookTitle}
            {state.bookAuthor ? ` — ${state.bookAuthor}` : ""}
          </span>
        </div>
      )}

      <Link href={`/post/${state.id}`}>
        <p className="mt-4 text-[15px] whitespace-pre-wrap break-words leading-[1.8]" style={{ color: "#1C1B19" }}>
          {state.content}
        </p>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="mt-3 rounded-sm max-h-[480px] w-full object-cover border"
            style={{ borderColor: "#E4E0D6" }}
          />
        )}
      </Link>

      {showReport && (
        <div className="mt-3 p-3 rounded-sm text-sm border" style={{ background: "#FBFAF7", borderColor: "#E4E0D6" }}>
          <label
            className="block text-[10px] uppercase tracking-widest mb-1.5"
            style={{ fontFamily: "var(--font-mono, monospace)", color: "#8A8478" }}
          >
            Laporkan post ini
          </label>
          <input
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Jelaskan alasannya..."
            className="w-full border rounded-sm px-2.5 py-1.5 text-sm bg-white"
            style={{ borderColor: "#E4E0D6", color: "#1C1B19" }}
          />
          <button
            onClick={submitReport}
            className="mt-2 text-xs uppercase tracking-wide font-medium"
            style={{ fontFamily: "var(--font-mono, monospace)", color: "#A13D2E" }}
          >
            Kirim Laporan
          </button>
        </div>
      )}

      <div className="post-actions">
        <button
          onClick={() => react("LIKE")}
          disabled={busy}
          aria-label="Suka post"
          aria-pressed={state.myReaction === "LIKE"}
          style={{ color: state.myReaction === "LIKE" ? "#1F4D3A" : "#5C5648" }}
        >
          <IconThumbUp filled={state.myReaction === "LIKE"} />
          <span style={{ fontFamily: "var(--font-mono, monospace)" }} className="text-xs">
            {state.likeCount}
          </span>
        </button>
        <button
          onClick={() => react("DISLIKE")}
          disabled={busy}
          aria-label="Tidak suka post"
          aria-pressed={state.myReaction === "DISLIKE"}
          style={{ color: state.myReaction === "DISLIKE" ? "#A13D2E" : "#5C5648" }}
        >
          <IconThumbDown filled={state.myReaction === "DISLIKE"} />
          <span style={{ fontFamily: "var(--font-mono, monospace)" }} className="text-xs">
            {state.dislikeCount}
          </span>
        </button>
        <Link
          href={`/post/${state.id}`}
          aria-label={`${state.commentCount} komentar`}
          style={{ color: "#5C5648" }}
        >
          <IconComment />
          <span style={{ fontFamily: "var(--font-mono, monospace)" }} className="text-xs">
            {state.commentCount}
          </span>
        </Link>
        <button
          onClick={share}
          aria-label="Bagikan post"
          style={{ color: "#5C5648" }}
        >
          <IconShare />
          <span style={{ fontFamily: "var(--font-mono, monospace)" }} className="text-xs">
            {state.shareCount}
          </span>
        </button>
        <button
          onClick={toggleBookmark}
          aria-label={state.isBookmarked ? "Hapus dari daftar bacaan" : "Simpan ke daftar bacaan"}
          aria-pressed={!!state.isBookmarked}
          style={{ color: state.isBookmarked ? "#B8863B" : "#5C5648" }}
        >
          <IconBookmark filled={state.isBookmarked} />
        </button>
      </div>
    </article>
  );
}