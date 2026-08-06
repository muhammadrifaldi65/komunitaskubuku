"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

/**
 * Design tokens (add once to your global setup, e.g. tailwind.config or CSS vars):
 *   --color-canvas: #FBFAF7
 *   --color-ink:    #1C1B19
 *   --color-forest: #1F4D3A
 *   --color-brass:  #B8863B
 *   --color-rule:   #E4E0D6
 *   --color-brick:  #A13D2E
 *
 * Fonts (via next/font/google in your root layout):
 *   Fraunces      -> --font-display  (wordmark, headings)
 *   "Public Sans" -> --font-body     (default UI text)
 *   "IBM Plex Mono" -> --font-mono   (labels, counters, timestamps)
 */

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3.5 6 8.5 7 8.5-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBookmarkStack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 3.5h9a1 1 0 0 1 1 1V21l-5.5-3.2L5 21V4.5a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTool() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4L14.7 6.3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: "#FBFAF7", borderColor: "#E4E0D6" }}
    >
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="w-1.5 h-6 rounded-[1px]"
            style={{ background: "#1F4D3A" }}
            aria-hidden
          />
          <span
            className="text-xl italic tracking-tight"
            style={{ fontFamily: "var(--font-display, serif)", color: "#1C1B19" }}
          >
            Klub Baca
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="sm:hidden p-2 rounded-sm text-sm text-[var(--color-ink)] ring-1 ring-[#E4E0D6]"
          aria-label={open ? "Tutup menu" : "Buka menu"}
        >
          {open ? "Tutup" : "Menu"}
        </button>

        <nav className="hidden sm:flex items-center gap-1 text-sm">
          {status === "loading" ? null : session ? (
            <>
              <Link
                href="/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs tracking-wide uppercase font-medium rounded-sm border transition-colors"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  background: "#1F4D3A",
                  color: "#FBFAF7",
                  borderColor: "#1F4D3A",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#163728")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1F4D3A")}
              >
                + Tulis
              </Link>

              <div className="w-px h-5 mx-1" style={{ background: "#E4E0D6" }} />

              <Link
                href="/notifications"
                className="p-2 rounded-sm transition-colors"
                style={{ color: "#1C1B19" }}
                title="Notifikasi"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#B8863B")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1C1B19")}
              >
                <IconBell />
              </Link>
              <Link
                href="/messages"
                className="p-2 rounded-sm transition-colors"
                style={{ color: "#1C1B19" }}
                title="Pesan"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#B8863B")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1C1B19")}
              >
                <IconMail />
              </Link>
              <Link
                href="/reading-list"
                className="p-2 rounded-sm transition-colors"
                style={{ color: "#1C1B19" }}
                title="Daftar Bacaan"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#B8863B")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1C1B19")}
              >
                <IconBookmarkStack />
              </Link>
              {(session.user.role === "ADMIN" || session.user.role === "PEMBINA") && (
                <Link
                  href="/admin"
                  className="p-2 rounded-sm transition-colors"
                  style={{ color: "#1C1B19" }}
                  title="Dashboard Admin"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#B8863B")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#1C1B19")}
                >
                  <IconTool />
                </Link>
              )}

              <div className="relative ml-1">
                <button
                  onClick={() => setOpen((o) => !o)}
                  className="flex items-center"
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  <img
                    src={session.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${session.user.name}`}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover ring-1"
                    style={{ boxShadow: "0 0 0 1px #1C1B19" }}
                  />
                </button>
                {open && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 border rounded-sm shadow-sm py-1"
                    style={{ background: "#FBFAF7", borderColor: "#E4E0D6" }}
                  >
                    <div
                      className="px-4 pt-1.5 pb-2 text-[10px] uppercase tracking-widest"
                      style={{ fontFamily: "var(--font-mono, monospace)", color: "#8A8478" }}
                    >
                      Akun
                    </div>
                    <Link
                      href={`/profile/${session.user.username}`}
                      className="block px-4 py-2 text-sm hover:bg-[#F1EEE6]"
                      style={{ color: "#1C1B19" }}
                      onClick={() => setOpen(false)}
                    >
                      Profil Saya
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm hover:bg-[#F1EEE6]"
                      style={{ color: "#1C1B19" }}
                      onClick={() => setOpen(false)}
                    >
                      Pengaturan
                    </Link>
                    <div className="my-1 border-t" style={{ borderColor: "#E4E0D6" }} />
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-[#F1EEE6]"
                      style={{ color: "#A13D2E" }}
                    >
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-sm transition-colors"
                style={{ color: "#1F4D3A" }}
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 text-xs tracking-wide uppercase font-medium rounded-sm border"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  background: "#1F4D3A",
                  color: "#FBFAF7",
                  borderColor: "#1F4D3A",
                }}
              >
                Daftar
              </Link>
            </>
          )}
        </nav>
      </div>

      {open && (
        <div className="sm:hidden border-t" style={{ borderColor: "#E4E0D6", background: "#FBFAF7" }}>
          <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
            {status === "loading" ? null : session ? (
              <>
                <Link
                  href="/create"
                  className="block w-full rounded-sm bg-[#1F4D3A] px-4 py-3 text-center text-sm font-semibold text-white"
                  onClick={() => setOpen(false)}
                >
                  + Tulis Post
                </Link>
                <Link
                  href="/notifications"
                  className="block rounded-sm border px-4 py-3 text-sm"
                  style={{ borderColor: "#E4E0D6", color: "#1C1B19" }}
                  onClick={() => setOpen(false)}
                >
                  Notifikasi
                </Link>
                <Link
                  href="/messages"
                  className="block rounded-sm border px-4 py-3 text-sm"
                  style={{ borderColor: "#E4E0D6", color: "#1C1B19" }}
                  onClick={() => setOpen(false)}
                >
                  Pesan
                </Link>
                <Link
                  href="/reading-list"
                  className="block rounded-sm border px-4 py-3 text-sm"
                  style={{ borderColor: "#E4E0D6", color: "#1C1B19" }}
                  onClick={() => setOpen(false)}
                >
                  Daftar Bacaan
                </Link>
                {(session.user.role === "ADMIN" || session.user.role === "PEMBINA") && (
                  <Link
                    href="/admin"
                    className="block rounded-sm border px-4 py-3 text-sm"
                    style={{ borderColor: "#E4E0D6", color: "#1C1B19" }}
                    onClick={() => setOpen(false)}
                  >
                    Dashboard Admin
                  </Link>
                )}
                <div className="border-t pt-2" style={{ borderColor: "#E4E0D6" }}>
                  <Link
                    href={`/profile/${session.user.username}`}
                    className="block rounded-sm px-4 py-3 text-sm"
                    style={{ color: "#1C1B19" }}
                    onClick={() => setOpen(false)}
                  >
                    Profil Saya
                  </Link>
                  <Link
                    href="/settings"
                    className="block rounded-sm px-4 py-3 text-sm"
                    style={{ color: "#1C1B19" }}
                    onClick={() => setOpen(false)}
                  >
                    Pengaturan
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="w-full text-left rounded-sm px-4 py-3 text-sm text-[#A13D2E]"
                  >
                    Keluar
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block rounded-sm border px-4 py-3 text-sm"
                  style={{ borderColor: "#E4E0D6", color: "#1C1B19" }}
                  onClick={() => setOpen(false)}
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="block rounded-sm bg-[#1F4D3A] px-4 py-3 text-center text-sm font-semibold text-white"
                  onClick={() => setOpen(false)}
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}