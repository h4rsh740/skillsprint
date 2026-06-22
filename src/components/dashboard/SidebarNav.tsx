"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  BrainCircuit, 
  FileText, 
  Map, 
  Mic, 
  Sparkles, 
  Network, 
  Briefcase, 
  Search, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Trophy,
  Link2,
  Shield,
  User as UserIcon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function SidebarNav() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { name: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { name: "Career Twin", path: "/dashboard/career-twin", icon: BrainCircuit },
    { name: "Resume Intel", path: "/dashboard/resume-intelligence", icon: FileText },
    { name: "Learning Roadmap", path: "/dashboard/roadmap", icon: Map },
    { name: "Mock Interviews", path: "/dashboard/mock-interview", icon: Mic },
    { name: "AI Career Coach", path: "/dashboard/chat", icon: Sparkles },
    { name: "3D Skill Graph", path: "/dashboard/skill-graph", icon: Network },
    { name: "Job Matching", path: "/dashboard/jobs", icon: Briefcase },
    { name: "Talent Leaderboard", path: "/dashboard/leaderboard", icon: Trophy },
    { name: "Portfolio Analyzer", path: "/dashboard/portfolio-analyzer", icon: Link2 },
    { name: "Hackathons", path: "/dashboard/hackathons", icon: Trophy },
    { name: "Recruiter Search", path: "/dashboard/search", icon: Search },
    { name: "Admin Panel", path: "/dashboard/admin", icon: Shield },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white text-gray-900 border-r border-gray-200">
      {/* Brand Logo */}
      <div className="p-6 border-b border-gray-200 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-tr from-[#4f46e5] to-[#06b6d4] rounded-full flex items-center justify-center">
          <BrainCircuit className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-[15px] text-gray-900 leading-tight tracking-tight">SkillSprint AI</h1>
          <span className="text-[9px] bg-[#06b6d4] text-white px-1.5 py-0.5 rounded font-black mt-1 inline-block">PRO</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.path;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.path}
              onClick={() => setIsOpen(false)}
              className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[13.5px] font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-[#4f46e5] text-white shadow-md shadow-[#4f46e5]/20 scale-[1.02]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 space-y-2 bg-white/80 backdrop-blur-sm">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-2xl border border-gray-150 mb-2 overflow-hidden">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.name} 
                className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-tr from-[#4f46e5] to-[#06b6d4] rounded-full flex items-center justify-center text-white text-[13px] font-bold uppercase flex-shrink-0">
                {user.name.substring(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold text-gray-800 truncate leading-snug">{user.name}</div>
              <div className="text-[10px] text-gray-400 truncate leading-none mt-0.5">{user.email}</div>
            </div>
          </div>
        )}
        <Link
          href="/dashboard/settings"
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
            pathname === "/dashboard/settings"
              ? "bg-[#4f46e5]/10 text-[#4f46e5]"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Settings className="w-4 h-4 text-gray-500" />
          <span>Settings</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 transition-all text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-white px-6 py-4 border-b border-gray-200 fixed top-0 left-0 right-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#4f46e5] to-[#06b6d4] rounded-full flex items-center justify-center">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">SkillSprint AI</span>
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
        >
          <Menu className="w-4.5 h-4.5 text-gray-900" />
        </button>
      </div>

      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden md:block w-[260px] h-screen sticky top-0 bg-white border-r border-gray-200 z-30">
        {navContent}
      </aside>

      {/* Mobile Sidebar Slide-Over Drawer */}
      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

        {/* Drawer panel */}
        <div
          className={`relative w-[280px] h-full bg-white flex flex-col transition-transform duration-300 ease-out z-10 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-900" />
          </button>
          {navContent}
        </div>
      </div>
    </>
  );
}

