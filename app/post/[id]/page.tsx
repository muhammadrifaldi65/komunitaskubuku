"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PostCard, { PostData } from "@/components/PostCard";
import CommentSection from "@/components/CommentSection";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/posts/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPost(data.post);
      setLoading(false);
    })();
  }, [id]);


  if (loading) return <p className="text-center text-gray-400 text-sm py-16">Memuat...</p>;
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
