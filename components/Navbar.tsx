"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { toPublicImageUrl } from "@/lib/media-url";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    { href: "/", label: "Beranda" },
    ...(session ? [
      { href: "/reading-list", label: "Daftar bacaan" },
      { href: "/notifications", label: "Notifikasi" },
      { href: "/messages", label: "Pesan" },
    ] : []),
  ];

  async function handleSignOut() {
    await signOut({ redirect: false });
    setOpen(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="site-header" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
      <div className="site-nav">
        <Link href="/" className="wordmark" onClick={() => setOpen(false)} aria-label="PTHREE — Beranda">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M14 7c-3-2-7-2-11-1v17c4-1 8-1 11 1 3-2 7-2 11-1V6c-4-1-8-1-11 1Zm0 0v17" />
          </svg>
          PTHREE<span className="wordmark-period">.</span>
        </Link>
        <nav className="desktop-links" aria-label="Navigasi utama">
          {links.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
        </nav>
        <div className="nav-actions">
          {session && <Link href="/create" className="button-primary nav-write">Tulis post <span aria-hidden="true">+</span></Link>}
          {status !== "loading" && !session && <Link href="/login" className="nav-login">Masuk <span aria-hidden="true">↗</span></Link>}
          <button className="account-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="account-navigation" aria-label={open ? "Tutup menu" : "Buka menu"}>
            {session ? <img src={toPublicImageUrl(session.user.avatarUrl) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.user.name || "Pembaca")}`} alt="" width={34} height={34} /> : <span className="mobile-menu-label">Menu</span>}
            {session && <span aria-hidden="true">⌄</span>}
          </button>
        </div>
        {open && <nav id="account-navigation" className="account-navigation" aria-label="Menu akun">
          <div className="mobile-links">{links.map(({ href, label }) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</div>
          {session ? <>
            <p className="account-name">{session.user.name}</p>
            <Link href={`/profile/${session.user.username}`} onClick={() => setOpen(false)}>Profil saya</Link>
            <Link href="/settings" onClick={() => setOpen(false)}>Pengaturan</Link>
            {(session.user.role === "ADMIN" || session.user.role === "PEMBINA") && <Link href="/admin" onClick={() => setOpen(false)}>Dashboard admin</Link>}
            <button onClick={handleSignOut}>Keluar</button>
          </> : <Link href="/login" onClick={() => setOpen(false)}>Masuk untuk bergabung</Link>}
        </nav>}
      </div>
    </header>
  );
}
