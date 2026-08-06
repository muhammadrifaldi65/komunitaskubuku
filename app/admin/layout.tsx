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
    <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6">
      <aside className="w-48 shrink-0 hidden sm:block">
        <div className="bg-white border rounded-xl p-2 sticky top-20">
          <p className="text-xs text-gray-400 px-2 py-1">
            Login sebagai {session?.user.role === "ADMIN" ? "Admin" : "Pembina"}
          </p>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 ${
                  pathname === item.href ? "bg-emerald-600 text-white" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Icon /> {item.label}
              </Link>
            );
          })}
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
