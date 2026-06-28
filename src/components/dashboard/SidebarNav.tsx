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
  ArrowRight,
  Clock,
  Users
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function SidebarNav() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [londonTime, setLondonTime] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        timeZone: "Asia/Kolkata", 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: true 
      };
      setLondonTime(new Intl.DateTimeFormat("en-IN", options).format(now).toUpperCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
    { name: "Admin Panel", path: "/dashboard/admin", icon: Shield },
    { name: "AI Shortlisting", path: "/dashboard/shortlisting", icon: Users },
  ];

  const handleLogout = async () => {
    await logout();
  };

  // Desktop sidebar content
  const desktopSidebarContent = (
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
              className={`group flex items-center justify-between px-4 py-3 rounded-2xl text-[13.5px] font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-[#4f46e5] text-white shadow-md shadow-[#4f46e5]/20 scale-[1.02]"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
                {/* Vertical slide text animation */}
                <div className="h-[20px] overflow-hidden relative">
                  <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                    <span className="h-[20px] flex items-center">{link.name}</span>
                    <span className="h-[20px] flex items-center">{link.name}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic rotating Arrow indicator */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                isActive 
                  ? "bg-white/20 text-white" 
                  : "bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-700"
              }`}>
                <ArrowRight className="w-2.5 h-2.5 transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45" />
              </div>
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
          className={`group flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
            pathname === "/dashboard/settings"
              ? "bg-[#4f46e5]/10 text-[#4f46e5]"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <div className="h-[20px] overflow-hidden relative">
              <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                <span className="h-[20px] flex items-center">Settings</span>
                <span className="h-[20px] flex items-center">Settings</span>
              </div>
            </div>
          </div>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
            pathname === "/dashboard/settings"
              ? "bg-[#4f46e5]/20 text-[#4f46e5]"
              : "bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-700"
          }`}>
            <ArrowRight className="w-2.5 h-2.5 transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45" />
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="group w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div className="h-[20px] overflow-hidden relative">
              <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                <span className="h-[20px] flex items-center">Sign Out</span>
                <span className="h-[20px] flex items-center">Sign Out</span>
              </div>
            </div>
          </div>
          <div className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center transition-all duration-300 group-hover:bg-red-200">
            <ArrowRight className="w-2.5 h-2.5 transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45" />
          </div>
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
          className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center mr-1"
        >
          <Menu className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden md:block w-[260px] h-screen sticky top-0 bg-white border-r border-gray-200 z-30">
        {desktopSidebarContent}
      </aside>

      {/* Mobile Sidebar Slide-Over Drawer (Bottom Sheet Style matching landing page) */}
      <div
        className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-500 md:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />

        {/* Drawer panel */}
        <div
          className={`relative bg-white rounded-2xl mx-3 mb-3 p-6 flex flex-col max-h-[85vh] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-10 ${
            isOpen ? "translate-y-0" : "translate-y-[120%]"
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-[13px] text-gray-600 font-medium">{londonTime} IST</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* User Profile Card */}
          {user && (
            <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-150 mb-6">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.name} 
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-tr from-[#4f46e5] to-[#06b6d4] rounded-full flex items-center justify-center text-white text-[14px] font-bold uppercase">
                  {user.name.substring(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-gray-800 truncate">{user.name}</div>
                <div className="text-[10.5px] text-gray-400 truncate mt-0.5">{user.email}</div>
              </div>
            </div>
          )}

          {/* Scrollable Links */}
          <nav className="flex flex-col gap-4 mb-8 overflow-y-auto max-h-[40vh] pr-1">
            {links.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.name}
                  href={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`text-[28px] leading-[32px] font-medium tracking-tight transition-colors duration-300 ${
                    isActive ? "text-[#4f46e5]" : "text-gray-900 hover:text-[#4f46e5]"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action buttons at the bottom */}
          <button 
            onClick={() => { setIsOpen(false); handleLogout(); }} 
            className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 transition-colors text-white text-[15px] font-medium rounded-full p-4 w-full mb-3 cursor-pointer"
          >
            Sign Out
            <LogOut className="w-4 h-4" />
          </button>
          <Link 
            href="/dashboard/settings" 
            onClick={() => setIsOpen(false)} 
            className="flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] transition-colors text-white text-[15px] font-medium rounded-full p-4 w-full"
          >
            Settings
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
