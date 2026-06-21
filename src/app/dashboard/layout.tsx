"use client";

import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Shader, ChromaFlow, FilmGrain, FlutedGlass, Swirl } from "shaders/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#EFEFEF] font-sans text-gray-900 selection:bg-[#4f46e5] selection:text-white">
      {/* Background Shader (lowered intensity/opacity for dashboard readability) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <Shader>
          <Swirl colorA="#ffffff" colorB="#e0e7ff" detail={1.7} />
          <ChromaFlow baseColor="#ffffff" downColor="#4f46e5" leftColor="#3b82f6" rightColor="#8b5cf6" upColor="#6366f1" momentum={13} radius={3.5} />
          <FlutedGlass aberration={0.61} angle={31} frequency={8} highlight={0.12} highlightSoftness={0} lightAngle={-90} refraction={4} shape="rounded" softness={1} speed={0.15} />
          <FilmGrain strength={0.05} />
        </Shader>
      </div>

      {/* Floating Navigation */}
      <DashboardNav />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-8 pb-20 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
