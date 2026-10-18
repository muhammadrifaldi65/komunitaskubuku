"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { toPublicImageUrl } from "@/lib/media-url";

const paths: Record<string, string> = {
  home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  book: "M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1m0-16c3-2 7-2 10-1v16c-3-1-7-1-10 1V5Z",
  bookmark: "M6 3h12v18l-6-4-6 4Z",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4",
  mail: "M3 5h18v14H3ZM3 5l9 8 9-8",
  user: "M20 21v-2a7 7 0 0 0-14 0v2M17 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  admin: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
  settings: "M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
};

function NavIcon({ name }: { name: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/?search=1", label: "Jelajahi", icon: "search" },
    ...(session ? [
      { href: "/reading-list", label: "Daftar bacaan", icon: "book" },
      { href: "/bookmarks", label: "Markah", icon: "bookmark" },
      { href: "/notifications", label: "Notifikasi", icon: "bell" },
      { href: "/messages", label: "Pesan", icon: "mail" },
      { href: `/${encodeURIComponent(session.user.username)}`, label: "Profil", icon: "user" },
      ...(["ADMIN", "PEMBINA"].includes(session.user.role) ? [{ href: "/admin", label: "Dashboard admin", icon: "admin" }] : []),
      { href: "/settings", label: "Pengaturan", icon: "settings" },
    ] : []),
  ];
  async function handleSignOut() {
    await signOut({ redirect: false });
    setOpen(false);
    router.replace("/");
    router.refresh();
  }
  return (
    <header className="app-navigation" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <div className="navigation-top">
        <Link href="/" className="wordmark" onClick={() => setOpen(false)} aria-label="PTHREE — Beranda">PTHREE<span aria-hidden="true">.</span></Link>
        <button className="mobile-menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="primary-navigation">{open ? "Tutup" : "Menu"}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d={open ? "m6 6 12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} /></svg></button>
      </div>
      <div id="primary-navigation" className={`navigation-content${open ? " is-open" : ""}`}>
        <nav aria-label="Navigasi utama" className="primary-links">
          {links.map(({href,label,icon}) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={href === pathname || (href === "/admin" && pathname.startsWith("/admin/")) ? "page" : undefined}><NavIcon name={icon} /><span>{label}</span></Link>)}
        </nav>
        {session ? <>
          <Link href="/create" className="button-primary compose-button" onClick={() => setOpen(false)}>Tulis post <span aria-hidden="true">+</span></Link>
          <div className="sidebar-account"><Link href={`/${encodeURIComponent(session.user.username)}`} onClick={() => setOpen(false)}><img src={toPublicImageUrl(session.user.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.user.name || "Pembaca")}`} alt="" width={40} height={40} /><span><strong>{session.user.name}</strong><small>@{session.user.username}</small></span></Link><button onClick={handleSignOut}>Keluar</button></div>
        </> : status !== "loading" && <div className="join-prompt"><h2>Temukan teman baca.</h2><p>Berbagi cerita, bertukar perspektif, menemukan buku berikutnya.</p><Link href="/login" className="button-primary" onClick={() => setOpen(false)}>Masuk ke PTHREE</Link></div>}
        <p className="navigation-caption">Satu buku. Banyak sudut pandang.</p>
      </div>
    </header>
  );
}
