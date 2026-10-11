"use client";

import { useEffect, useState } from "react";
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

const ROLE_ACCENT: Record<string, string> = {
  ADMIN: "#A13D2E",
  PEMBINA: "#B8863B",
  USER: "#1F4D3A",
};

function IconReply() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 17 4 12l5-5M4 12h11a5 5 0 0 1 5 5v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 11 18-8-8 18-2-8-8-2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CommentItem({ comment, postId, onReplied }: { comment: CommentData; postId: string; onReplied: () => void }) {
  const { data: session } = useSession();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const accent = ROLE_ACCENT[comment.author.role] || "#1F4D3A";

  async function submitReply() {
    if (!session) return (window.location.href = "/login");
    if (!replyText.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText, parentId: comment.id }),
    });
    setBusy(false);
    if (res.ok) {
      setReplyText("");
      setReplying(false);
      onReplied();
    }
  }

  return (
    <div className="py-2.5">
      <div className="flex gap-2.5">
        <img
          src={toPublicImageUrl(comment.author.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.author.name}`}
          className="w-7 h-7 rounded-full object-cover ring-1 shrink-0"
          style={{ boxShadow: "0 0 0 1px #E4E0D6" }}
          alt=""
        />
        <div className="flex-1 min-w-0">
          <div
            className="rounded-sm px-3 py-2 border-l-2"
            style={{ background: "#FBFAF7", borderColor: accent }}
          >
            <Link
              href={`/profile/${comment.author.username}`}
              className="font-semibold text-xs hover:underline"
              style={{ color: "#1C1B19" }}
            >
              {comment.author.name}
            </Link>
            <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#1C1B19" }}>
              {comment.content}
            </p>
          </div>
          <div
            className="flex items-center gap-3 text-xs mt-1 px-1"
            style={{ fontFamily: "var(--font-mono, monospace)", color: "#8A8478" }}
          >
            <span>{timeAgo(comment.createdAt)}</span>
            <button
              onClick={() => setReplying((r) => !r)}
              className="flex items-center gap-1 hover:opacity-70"
            >
              <IconReply />
              Balas
            </button>
          </div>

          {replying && (
            <div className="mt-1.5 flex gap-1.5">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tulis balasan..."
                className="flex-1 border rounded-sm px-3 py-1.5 text-xs bg-white"
                style={{ borderColor: "#E4E0D6", color: "#1C1B19" }}
                autoFocus
              />
              <button
                disabled={busy}
                onClick={submitReply}
                className="flex items-center gap-1 text-xs font-medium px-2.5 rounded-sm border disabled:opacity-40"
                style={{ borderColor: "#1F4D3A", color: "#1F4D3A" }}
              >
                <IconSend />
              </button>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-4 mt-1 pl-3 border-l" style={{ borderColor: "#E4E0D6" }}>
              {comment.replies.map((r) => (
                <CommentItem key={r.id} comment={r} postId={postId} onReplied={onReplied} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({ postId }: { postId: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/posts/${postId}/comments`);
    const data = await res.json();
    if (res.ok) setComments(data.comments);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return (window.location.href = "/login");
    if (!text.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setBusy(false);
    if (res.ok) {
      setText("");
      load();
    }
  }

  return (
    <div className="mt-4 border-t pt-3" style={{ borderColor: "#E4E0D6" }}>
      <div
        className="text-[10px] uppercase tracking-widest mb-2.5"
        style={{ fontFamily: "var(--font-mono, monospace)", color: "#8A8478" }}
      >
        Komentar {comments.length > 0 ? `· ${comments.length}` : ""}
      </div>

      <form onSubmit={submitComment} className="flex flex-col gap-2 mb-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={session ? "Tulis komentar..." : "Masuk untuk berkomentar"}
          disabled={!session}
          rows={4}
          className="min-h-[100px] resize-none border rounded-sm px-3 py-2 text-sm bg-white disabled:bg-[#FBFAF7] disabled:text-[#8A8478]"
          style={{ borderColor: "#E4E0D6", color: "#1C1B19" }}
        />
        <button
          disabled={busy || !session}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide px-3 py-2 rounded-sm border disabled:opacity-40"
          style={{ fontFamily: "var(--font-mono, monospace)", borderColor: "#1F4D3A", color: "#1F4D3A" }}
        >
          <IconSend />
          Kirim
        </button>
      </form>

      {loading && (
        <p className="text-xs mt-2" style={{ color: "#8A8478" }}>
          Memuat komentar...
        </p>
      )}
      {!loading && comments.length === 0 && (
        <p className="text-xs mt-2" style={{ color: "#8A8478" }}>
          Belum ada komentar. Jadi yang pertama berbagi pendapat.
        </p>
      )}
      <div className="divide-y" style={{ borderColor: "#E4E0D6" }}>
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} postId={postId} onReplied={load} />
        ))}
      </div>
    </div>
  );
}