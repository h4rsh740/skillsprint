"use client";

import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DynamicShaderBackground } from "@/components/backgrounds/DynamicShaderBackground";
import { ProtectedRoute } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <ProtectedRoute>
      <div className="relative min-h-screen flex bg-[#EFEFEF] font-sans text-gray-900 selection:bg-[#4f46e5] selection:text-white">
      {/* Mobile Background Image */}
      <div className="fixed inset-0 z-0 pointer-events-none md:hidden">
        <img 
          src="https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2232&auto=format&fit=crop" 
          alt="" 
          className="w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#EFEFEF]/60 via-[#EFEFEF]/40 to-[#EFEFEF]" />
      </div>

      {/* Background Shader (hidden on mobile for performance) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 hidden md:block">
        <DynamicShaderBackground />
      </div>

      {/* Sticky Left Sidebar Navigation */}
      <SidebarNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 md:pt-8 pb-20 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
