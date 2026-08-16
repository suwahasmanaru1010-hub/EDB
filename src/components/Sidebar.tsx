"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Settings, LogOut, Link2 } from "lucide-react";
import { getAdminSession, clearAdminSession, AdminSession } from "@/lib/auth";

interface SidebarProps {
  onOpenNewModal?: () => void;
}

export default function Sidebar({ onOpenNewModal }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    setSession(getAdminSession());
  }, []);

  const handleLogout = () => {
    clearAdminSession();
    router.push("/login");
  };

  const allNavItems = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Entrepreneurs", href: "/entrepreneurs", icon: Users },
    { name: "CS Forms", href: "/cs-forms", icon: Link2 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const allowedTabs = session?.allowed_tabs || ['/', '/entrepreneurs', '/cs-forms', '/settings'];
  const navItems = allNavItems.filter(item => allowedTabs.includes(item.href));

  const adminInitials = session?.name
    ? session.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 p-6 flex-shrink-0 min-h-screen sticky top-0 h-screen justify-between z-30">
      <div className="space-y-8">
        {/* Brand Logo */}
        <div className="px-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">EDB</h1>
            <span className="bg-gray-200 text-gray-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm tracking-wider">
              ADMIN
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-medium">Database System</p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Main Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#2B2B2B] text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User / Footer Info & Logout */}
      <div className="pt-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#2B2B2B] flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
              {adminInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">
                {session?.name || "Janaki"}
              </p>
              <p className="text-[10px] text-gray-400 truncate">System User</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
