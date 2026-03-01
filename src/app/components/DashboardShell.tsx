"use client";

import { useState, type ReactNode } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: "rules",
    label: "Rules",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
];

interface Props {
  children: ReactNode;
  pendingCount?: number;
}

export default function DashboardShell({ children, pendingCount = 0 }: Props) {
  const [active, setActive] = useState("overview");

  function scrollTo(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <nav className="hidden md:flex flex-col items-center w-16 bg-[#0f0f18] border-r border-gray-800/50 py-6 gap-1 fixed h-full z-10">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
            P
          </div>
        </div>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            title={item.label}
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              active === item.id
                ? "bg-violet-600/20 text-violet-400"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
            }`}
          >
            {item.icon}
            {item.id === "approvals" && pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-copper-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-16 pb-20 md:pb-6">{children}</main>

      {/* Bottom tab bar — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f18] border-t border-gray-800/50 flex justify-around py-2 px-1 z-10">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              active === item.id
                ? "text-violet-400"
                : "text-gray-500"
            }`}
          >
            {item.icon}
            <span className="text-[10px]">{item.label}</span>
            {item.id === "approvals" && pendingCount > 0 && (
              <span className="absolute -top-0.5 right-1 w-4 h-4 bg-copper-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
