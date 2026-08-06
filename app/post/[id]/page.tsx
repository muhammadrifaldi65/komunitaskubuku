"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PostCard, { PostData } from "@/components/PostCard";
import CommentSection from "@/components/CommentSection";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
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

  async function handleDelete() {
    if (!confirm("Hapus postingan ini?")) return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/");
  }

  if (loading) return <p className="text-center text-gray-400 text-sm py-16">Memuat...</p>;
  if (notFound || !post) return <p className="text-center text-gray-400 text-sm py-16">Postingan tidak ditemukan.</p>;

  const isOwner = session?.user.id === post.author.id;

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <PostCard post={post} />
      {isOwner && (
        <button onClick={handleDelete} className="text-xs text-red-500 hover:underline mb-3">
          Hapus postingan
        </button>
      )}
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold text-sm mb-1">Komentar</h2>
        <CommentSection postId={post.id} />
      </div>
    </div>
  );
}
