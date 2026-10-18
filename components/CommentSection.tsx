"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toPublicImageUrl } from "@/lib/media-url";

interface CommentAuthor {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
}
interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  author: CommentAuthor;
  replies?: CommentData[];
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
  return `${Math.floor(diff / 86400)}h`;
}

async function sendComment(postId: string, content: string, parentId?: string) {
  const response = await fetch(`/api/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, parentId }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Gagal menyimpan komentar. Silakan coba lagi");
}

function CommentItem({ comment, postId, onReplied, parentUsername }: {
  comment: CommentData;
  postId: string;
  onReplied: () => Promise<void>;
  parentUsername?: string;
}) {
  const { data: session } = useSession();
  const [replying, setReplying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const composerId = useId();
  const repliesId = useId();
  const replies = comment.replies || [];

  async function submitReply(event: React.FormEvent) {
    event.preventDefault();
    if (!session || busy || !replyText.trim()) return;
    setBusy(true);
    setError("");
    try {
      await sendComment(postId, replyText, comment.id);
      setReplyText("");
      setReplying(false);
      await onReplied();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Koneksi terputus. Silakan coba lagi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="min-w-0 border-t py-4">
      <div className="flex gap-3">
        <img
          src={toPublicImageUrl(comment.author.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.author.name)}`}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
          alt=""
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <Link href={`/${encodeURIComponent(comment.author.username)}`} className="font-semibold hover:underline [overflow-wrap:anywhere]">
              {comment.author.name}
            </Link>
            <span className="text-[var(--color-muted)] [overflow-wrap:anywhere]">@{comment.author.username}</span>
            <time dateTime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString("id-ID")} className="text-xs text-[var(--color-muted)]">
              {timeAgo(comment.createdAt)}
            </time>
          </div>
          {parentUsername && <p className="mt-1 text-xs text-[var(--color-muted)] [overflow-wrap:anywhere]">Membalas @{parentUsername}</p>}
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{comment.content}</p>
          {session ? (
            <button type="button" onClick={() => setReplying(!replying)} aria-expanded={replying} aria-controls={replying ? composerId : undefined} className="min-h-11 text-xs font-medium text-[var(--color-accent)]">
              {replying ? "Batal membalas" : "Balas"}
            </button>
          ) : <Link href="/login" className="inline-flex min-h-11 items-center text-xs text-[var(--color-accent)]">Masuk untuk membalas</Link>}
          {replying && (
            <form id={composerId} onSubmit={submitReply} className="mb-2 space-y-2" aria-busy={busy}>
              <label htmlFor={`${composerId}-text`} className="block text-xs text-[var(--color-muted)]">Balasan untuk @{comment.author.username}</label>
              <textarea id={`${composerId}-text`} value={replyText} onChange={(event) => setReplyText(event.target.value)} disabled={busy} maxLength={1000} required rows={3} autoFocus placeholder="Tulis balasan..." className="w-full resize-y rounded-xl border bg-[var(--color-surface)] px-3 py-2 text-sm" />
              <button type="submit" disabled={busy || !replyText.trim()} className="button-primary">{busy ? "Mengirim..." : "Kirim balasan"}</button>
            </form>
          )}
          {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
          {replies.length > 0 && (
            <button type="button" aria-expanded={expanded} aria-controls={repliesId} onClick={() => setExpanded(!expanded)} className="block min-h-11 text-left text-sm font-medium text-[var(--color-accent)]">
              {expanded ? "Sembunyikan balasan" : "Lihat balasan lainnya"} ({replies.length})
            </button>
          )}
        </div>
      </div>
      {/* ponytail: one reply gutter at every depth; use a separate thread view if branching needs more context. */}
      {replies.length > 0 && (
        <div id={repliesId} hidden={!expanded} className={parentUsername ? "" : "ml-3 border-l pl-3 sm:ml-5 sm:pl-4"}>
          {expanded && replies.map((reply) => <CommentItem key={reply.id} comment={reply} postId={postId} onReplied={onReplied} parentUsername={comment.author.username} />)}
        </div>
      )}
    </article>
  );
}

export default function CommentSection({ postId }: { postId: string }) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const composerId = useId();
  const loadVersion = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const version = ++loadVersion.current;
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat komentar");
      if (version === loadVersion.current && !signal?.aborted) setComments(data.comments);
    } catch (error) {
      if (version === loadVersion.current && !signal?.aborted) {
        setComments([]);
        setLoadError(error instanceof Error ? error.message : "Gagal memuat komentar. Silakan coba lagi");
      }
    } finally {
      if (version === loadVersion.current && !signal?.aborted) setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    const controller = new AbortController();
    setComments([]);
    setText("");
    setSubmitError("");
    void load(controller.signal);
    return () => { controller.abort(); loadVersion.current++; };
  }, [load]);

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    if (!session || busy || !text.trim()) return;
    setBusy(true);
    setSubmitError("");
    try {
      await sendComment(postId, text);
      setText("");
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Koneksi terputus. Silakan coba lagi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 border-t pt-4" aria-label="Komentar">
      <h2 className="mb-4 text-base font-semibold">Percakapan</h2>
      {session ? (
        <form onSubmit={submitComment} className="mb-4 space-y-3" aria-busy={busy}>
          <label htmlFor={composerId} className="block text-sm font-medium">Tulis komentar</label>
          <textarea id={composerId} value={text} onChange={(event) => setText(event.target.value)} disabled={busy} maxLength={1000} required rows={3} placeholder="Bagikan pendapatmu tentang bacaan ini..." className="w-full resize-y rounded-xl border bg-[var(--color-surface)] px-3 py-3 text-sm" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--color-muted)]">{text.length}/1.000</span>
            <button type="submit" disabled={busy || !text.trim()} className="button-primary">{busy ? "Mengirim..." : "Kirim komentar"}</button>
          </div>
          {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}
        </form>
      ) : status === "loading" ? <p role="status" className="mb-4 text-sm text-[var(--color-muted)]">Memuat sesi...</p> : (
        <p className="mb-4 text-sm text-[var(--color-muted)]"><Link href="/login" className="font-medium text-[var(--color-accent)] hover:underline">Masuk</Link> untuk ikut berkomentar.</p>
      )}
      {loading && <p role="status" className="py-3 text-sm text-[var(--color-muted)]">Memuat komentar...</p>}
      {loadError && <div className="py-3"><p role="alert" className="text-sm text-red-700">{loadError}</p><button type="button" onClick={() => void load()} className="min-h-11 text-sm font-medium text-[var(--color-accent)]">Coba lagi</button></div>}
      {!loading && !loadError && comments.length === 0 && <p className="py-3 text-sm text-[var(--color-muted)]">Belum ada komentar. Jadi yang pertama berbagi pendapat.</p>}
      {comments.map((comment) => <CommentItem key={comment.id} comment={comment} postId={postId} onReplied={load} />)}
    </section>
  );
}