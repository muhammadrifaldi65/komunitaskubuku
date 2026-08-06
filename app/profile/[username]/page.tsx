"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import PostCard, { PostData } from "@/components/PostCard";

interface ProfileUser {
  id: string;
  username: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  role: "ADMIN" | "PEMBINA" | "USER";
  createdAt: string;
  _count: { posts: number; followers: number; following: number };
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: session } = useSession();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function load() {
    const res = await fetch(`/api/users/${username}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUser(data.user);
    setPosts(data.posts);
    setIsFollowing(data.isFollowing);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function toggleFollow() {
    if (!session) return (window.location.href = "/login");
    const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setIsFollowing(data.following);
      setUser((u) =>
        u ? { ...u, _count: { ...u._count, followers: u._count.followers + (data.following ? 1 : -1) } } : u
      );
    }
  }

  if (loading) return <p className="text-center text-gray-400 text-sm py-16">Memuat...</p>;
  if (notFound || !user) return <p className="text-center text-gray-400 text-sm py-16">Pengguna tidak ditemukan.</p>;

  const isOwnProfile = session?.user.username === username;

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="bg-white border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
            className="w-20 h-20 rounded-full object-cover border"
            alt=""
          />
          {isOwnProfile ? (
            <a href="/settings" className="text-sm border px-3 py-1.5 rounded-full hover:bg-gray-50">
              Edit Profil
            </a>
          ) : (
            <button
              onClick={toggleFollow}
              className={`text-sm px-4 py-1.5 rounded-full ${
                isFollowing ? "border text-gray-600 hover:bg-gray-50" : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {isFollowing ? "Mengikuti" : "Ikuti"}
            </button>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg">{user.name}</h1>
            {user.role !== "USER" && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                {user.role === "ADMIN" ? "Admin" : "Pembina"}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">@{user.username}</p>
          {user.bio && <p className="text-sm mt-2">{user.bio}</p>}
        </div>

        <div className="flex gap-4 mt-3 text-sm">
          <span>
            <b>{user._count.posts}</b> <span className="text-gray-400">Post</span>
          </span>
          <span>
            <b>{user._count.followers}</b> <span className="text-gray-400">Pengikut</span>
          </span>
          <span>
            <b>{user._count.following}</b> <span className="text-gray-400">Mengikuti</span>
          </span>
        </div>
      </div>

      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {posts.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Belum ada postingan.</p>}
    </div>
  );
}
