"use client";

import { Bell, User, Plus, Search } from "lucide-react";

interface DesktopHeaderProps {
  title: string;
  subtitle?: string;
  onOpenNewModal?: () => void;
  showNewButton?: boolean;
  newButtonText?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showIcons?: boolean;
}

export default function DesktopHeader({
  title,
  subtitle,
  onOpenNewModal,
  showNewButton = true,
  newButtonText = "New Entrepreneur",
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = false,
  showIcons = true,
}: DesktopHeaderProps) {
  return (
    <header className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100 sticky top-0 z-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Active Search Input */}
        {showSearch && (
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-gray-900 focus:bg-white w-64 lg:w-80 transition-all placeholder-gray-400"
            />
          </div>
        )}

        {/* Notifications & Profile (Only shown when showIcons is true) */}
        {showIcons && (
          <>
            <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100">
              <Bell className="w-4 h-4" />
            </button>

            <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100">
              <User className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Prominent "+ New" button on top right */}
        {showNewButton && onOpenNewModal && (
          <button
            onClick={onOpenNewModal}
            className="bg-[#2B2B2B] hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 border border-black/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{newButtonText}</span>
          </button>
        )}
      </div>
    </header>
  );
}
