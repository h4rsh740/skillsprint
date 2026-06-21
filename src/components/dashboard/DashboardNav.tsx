"use client";

import React, { useState, useEffect } from "react";
import { Clock, Menu, X, ArrowRight, BrainCircuit } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function DashboardNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [londonTime, setLondonTime] = useState("");
  const pathname = usePathname();

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

  const links = [
    { name: "Overview", path: "/dashboard" },
    { name: "Career Twin", path: "/dashboard/career-twin" },
    { name: "Resume Intel", path: "/dashboard/resume-intelligence" },
    { name: "Interviews", path: "/dashboard/mock-interview" },
  ];

  return (
    <>
      <div className="relative z-50 w-full max-w-[1440px] mx-auto p-2 sm:p-3 mt-4">
        <nav className="flex items-center justify-between bg-white/90 backdrop-blur-md rounded-full p-[5px] shadow-sm">
          {/* Left side */}
          <div className="flex items-center gap-6">
            <Link href="/" className="w-9 h-9 sm:w-10 sm:h-10 bg-[#4f46e5] rounded-full flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-white" />
            </Link>
            <div className="hidden md:flex items-center gap-6 ml-2">
              {links.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link 
                    key={link.name} 
                    href={link.path} 
                    className={`text-[14px] font-medium transition-colors duration-300 ${isActive ? "text-[#4f46e5]" : "text-gray-900 hover:text-[#4f46e5]"}`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side (Desktop) */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1.5 border-gray-200 pl-6 h-4">
              <Clock className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-[13px] text-gray-600 font-medium">{londonTime} IST</span>
            </div>
            <Link href="/dashboard/settings" className="group flex items-center gap-2 bg-gray-900 text-white text-[13px] font-medium rounded-full pl-5 pr-2 py-2 hover:bg-gray-800 transition-colors">
              <div className="h-[20px] overflow-hidden relative">
                <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                  <span className="h-[20px] flex items-center">Settings</span>
                  <span className="h-[20px] flex items-center">Settings</span>
                </div>
              </div>
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <ArrowRight className="w-3 h-3 text-gray-900 transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45" />
              </div>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center mr-1"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-4 h-4 text-white" />
          </button>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-[100] flex flex-col justify-end transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60" onClick={() => setIsMobileMenuOpen(false)} />
        <div className={`relative bg-white rounded-2xl mx-3 mb-3 p-6 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileMenuOpen ? 'translate-y-0' : 'translate-y-[120%]'}`}>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-[13px] text-gray-600 font-medium">{londonTime} IST</span>
            </div>
            <button 
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-5 h-5 text-gray-900" />
            </button>
          </div>
          <nav className="flex flex-col gap-4 mb-10">
            {links.map((link) => (
              <Link 
                key={link.name} 
                href={link.path} 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[28px] leading-[32px] font-medium text-gray-900 tracking-tight"
              >
                {link.name}
              </Link>
            ))}
          </nav>
          <Link href="/dashboard/settings" className="flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] transition-colors text-white text-[15px] font-medium rounded-full p-4 w-full">
            Settings
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
