"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PostCard, { PostData } from "@/components/PostCard";
import { toPublicImageUrl } from "@/lib/media-url";

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

type Member = Pick<ProfileUser, "id" | "username" | "name" | "avatarUrl" | "bio">;
type ConnectionKind = "followers" | "following";
const outlineButton = "rounded-full border border-stone-300 px-4 py-2 text-sm font-medium transition hover:bg-stone-100 disabled:opacity-50";

function avatar(member: Member) {
  return toPublicImageUrl(member.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`;
}

function MemberList({ username, kind }: { username: string; kind: ConnectionKind }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function load() {
      try {
        const search = new URLSearchParams({ kind });
        if (cursor) search.set("after", cursor);
        const res = await fetch(`/api/users/${encodeURIComponent(username)}/connections?${search}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat daftar anggota");
        if (controller.signal.aborted) return;
        setMembers((previous) => cursor ? [...previous, ...data.members] : data.members);
        setNextCursor(data.nextCursor);
        setTotal(data.total);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Gagal memuat daftar anggota");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [username, kind, cursor, retry]);

  return (
    <div aria-busy={loading}>
      {!loading && !error && <p className="mb-4 text-sm text-stone-500">{total} anggota dalam lingkaran ini</p>}
      <ul className="divide-y divide-stone-200">
        {members.map((member) => (
          <li key={member.id}>
            <Link href={`/profile/${encodeURIComponent(member.username)}`} className="flex items-center gap-3 rounded-lg py-4 transition hover:bg-stone-100">
              <img src={avatar(member)} alt="" className="h-11 w-11 shrink-0 rounded-full border border-stone-200 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-stone-800">{member.name}</p>
                <p className="truncate text-sm text-stone-500">@{member.username}</p>
                {member.bio && <p className="mt-1 line-clamp-1 text-sm text-stone-600">{member.bio}</p>}
              </div>
              <span aria-hidden="true" className="text-stone-400">↗</span>
            </Link>
          </li>
        ))}
      </ul>
      {loading && <p role="status" className="py-6 text-sm text-stone-500">Memuat anggota…</p>}
      {error && <div role="alert" className="py-4 text-sm text-red-800"><p>{error}</p><button onClick={() => setRetry((value) => value + 1)} className={`${outlineButton} mt-3`}>Coba lagi</button></div>}
      {!loading && !error && members.length === 0 && <p className="py-6 text-sm text-stone-500">{kind === "followers" ? "Belum ada pengikut. Percakapan yang baik bisa menjadi awal." : "Belum mengikuti siapa pun."}</p>}
      {!loading && !error && nextCursor && <button onClick={() => setCursor(nextCursor)} className={`${outlineButton} mt-4`}>Muat anggota lainnya</button>}
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: session, status } = useSession();
  if (status === "loading") return <p role="status" className="py-20 text-center text-sm text-stone-500">Memuat profil…</p>;
  return <ProfileContent key={`${username}:${session?.user.id ?? "guest"}`} username={username} viewerId={session?.user.id} />;
}

function ProfileContent({ username, viewerId }: { username: string; viewerId?: string }) {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followError, setFollowError] = useState("");
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<"posts" | ConnectionKind>("posts");
  const [connectionsVersion, setConnectionsVersion] = useState(0);
  const followRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function load() {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat profil");
        if (controller.signal.aborted) return;
        setUser(data.user);
        setPosts(data.posts);
        setIsFollowing(data.isFollowing);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Gagal memuat profil");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [username, retry]);

  useEffect(() => () => followRequest.current?.abort(), []);

  async function changeFollow() {
    if (!viewerId) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/profile/${username}`)}`);
      return;
    }
    if (followRequest.current || !user || user.id === viewerId) return;
    const controller = new AbortController();
    followRequest.current = controller;
    setFollowBusy(true);
    setFollowError("");
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/follow`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following: !isFollowing }), signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) router.push(`/login?callbackUrl=${encodeURIComponent(`/profile/${username}`)}`);
        throw new Error(data.error || "Gagal mengubah status mengikuti");
      }
      if (controller.signal.aborted) return;
      setIsFollowing(data.following);
      setUser((current) => current ? { ...current, _count: { ...current._count, followers: data.followersCount } } : current);
      setConnectionsVersion((value) => value + 1);
    } catch (error) {
      if (!controller.signal.aborted) setFollowError(error instanceof Error ? error.message : "Koneksi terputus. Coba lagi untuk menyimpan pilihan yang sama.");
    } finally {
      if (!controller.signal.aborted) {
        followRequest.current = null;
        setFollowBusy(false);
      }
    }
  }

  if (loading) return <p role="status" className="py-20 text-center text-sm text-stone-500">Memuat profil…</p>;
  if (error || !user) return <div className="mx-auto max-w-xl px-5 py-20 text-center"><p role="alert" className="text-stone-600">{error || "Pengguna tidak ditemukan"}</p><button onClick={() => setRetry((value) => value + 1)} className={`${outlineButton} mt-5`}>Coba lagi</button><Link href="/" className="ml-4 text-sm underline">Kembali ke beranda</Link></div>;

  const isOwnProfile = viewerId === user.id;
  const tabs = [
    { key: "posts" as const, label: "Tulisan", count: user._count.posts },
    { key: "followers" as const, label: "Pengikut", count: user._count.followers },
    { key: "following" as const, label: "Mengikuti", count: user._count.following },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500 hover:text-stone-800">Kembali ke ruang baca</Link>
      <header className="mt-7 border-b border-stone-200 pb-7">
        <div className="flex items-center justify-between gap-4">
          <img src={avatar(user)} className="h-24 w-24 rounded-full border border-stone-200 object-cover p-1 sm:h-28 sm:w-28" alt="" />
          {isOwnProfile ? (
            <Link href="/settings" className={outlineButton}>Edit profil</Link>
          ) : (
            <button onClick={changeFollow} disabled={followBusy} aria-pressed={isFollowing} className={`${outlineButton} ${isFollowing ? "text-stone-700" : "border-transparent bg-[#4b583d] text-white hover:bg-[#3b472e]"}`}>
              {followBusy ? "Menyimpan…" : isFollowing ? "Mengikuti" : "Ikuti pembaca"}
            </button>
          )}
        </div>
        {followError && <p role="alert" className="mt-4 text-sm text-red-800">{followError}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <h1 className="break-words font-[family-name:var(--font-display)] text-3xl leading-tight text-stone-900 sm:text-4xl">{user.name}</h1>
          {user.role !== "USER" && <span className="rounded-full border border-stone-300 px-2.5 py-1 text-[10px] uppercase tracking-widest text-[#4b583d]">{user.role === "ADMIN" ? "Admin" : "Pembina"}</span>}
        </div>
        <p className="mt-2 text-sm text-stone-500">@{user.username}</p>
        {user.bio && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-stone-700">{user.bio}</p>}
        <p className="mt-4 text-xs text-stone-400">Di ruang baca sejak {new Date(user.createdAt).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
      </header>
      <nav aria-label="Isi profil" className="mb-6 grid grid-cols-3 border-b border-stone-200">
        {tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} aria-current={tab === item.key ? "page" : undefined} aria-controls="profile-content" className={`border-b-2 px-2 py-5 text-sm transition ${tab === item.key ? "border-[#4b583d] text-[#4b583d]" : "border-transparent text-stone-500 hover:text-stone-800"}`}><span className="block font-[family-name:var(--font-display)] text-2xl">{item.count}</span><span className="mt-1 block text-xs">{item.label}</span></button>)}
      </nav>
      <section id="profile-content" aria-label={tabs.find((item) => item.key === tab)?.label}>
        {tab === "posts" ? <>
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
          {posts.length === 0 && <div className="py-12 text-center"><h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-700">Halaman yang masih kosong.</h2><p className="mt-3 text-sm text-stone-500">Belum ada tulisan. Setiap cerita punya waktunya sendiri.</p></div>}
        </> : <MemberList key={`${tab}:${connectionsVersion}`} username={username} kind={tab} />}
      </section>
    </div>
  );
}
