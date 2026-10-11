"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4h7v7H4zM13 4h7v4h-7zM4 13h7v7H4zM13 15h7v5h-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconContent() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5h16M4 12h10M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="3" width="16" height="18" rx="2" />
    </svg>
  );
}
function IconReports() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4h16v16H4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h8M8 16h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4h16v11H9l-5 5V4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV = [
  { href: "/admin", label: "Ringkasan", icon: IconDashboard },
  { href: "/admin/users", label: "Pengguna", icon: IconUsers },
  { href: "/admin/posts", label: "Konten", icon: IconContent },
  { href: "/admin/reports", label: "Laporan", icon: IconReports },
  { href: "/admin/chat", label: "Customer Service", icon: IconChat },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5 px-4 py-6 font-sans text-[#172335] lg:flex-row">
      <aside className="w-full shrink-0 lg:w-56">
        <nav aria-label="Navigasi admin" className="grid grid-cols-2 gap-1 rounded-2xl border border-[#dce4ed] bg-white p-2 lg:sticky lg:top-20 lg:grid-cols-1">
          <p className="col-span-full px-3 py-2 text-xs text-[#64748b]">
            Login sebagai {session?.user.role === "ADMIN" ? "Admin" : "Pembina"}
          </p>
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  active ? "bg-[#2563eb] text-white" : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#172335]"
                }`}
              >
                <span aria-hidden="true" className="shrink-0"><Icon /></span> {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}
