"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PostCard, { PostData } from "@/components/PostCard";
import CommentSection from "@/components/CommentSection";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, status } = useSession();
  if (status === "loading") return <p role="status" className="py-16 text-center text-sm text-[var(--muted)]">Memuat...</p>;
  return <PostDetail key={`${id}:${session?.user.id ?? "guest"}`} id={id} />;
}

function PostDetail({ id }: { id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/posts/${id}`, { signal: controller.signal, cache: "no-store" });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat postingan");
        if (!controller.signal.aborted) setPost(data.post);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Koneksi terputus. Coba lagi.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, retry]);


  if (loading) return <p className="text-center text-gray-400 text-sm py-16">Memuat...</p>;
  if (error) return <div className="px-4 py-16 text-center"><p role="alert" className="text-sm text-red-600">{error}</p><button onClick={() => setRetry((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-[var(--border)] px-4 text-sm">Coba lagi</button></div>;
  if (notFound || !post) return <p className="text-center text-gray-400 text-sm py-16">Postingan tidak ditemukan.</p>;


  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <PostCard post={post} onDeleted={() => { setPost(null); router.replace("/"); router.refresh(); }} />
      <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
        <h2 className="font-semibold text-sm mb-1">Komentar</h2>
        <CommentSection postId={post.id} />
      </div>
    </div>
  );
}
