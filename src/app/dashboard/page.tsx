"use client";

import { useRef } from "react";
import { BrainCircuit, Target, Trophy, Upload, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardOverview() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="flex flex-col gap-8 lg:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column - Options & Data */}
        <div className="space-y-8 lg:pr-4">
          <div>
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900">
              Welcome back, Alex.
            </h1>
            <p className="text-gray-600 mt-2 text-[15px]">You are currently in the top 12% of React developers in your cohort.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <MetricCard title="Placement Probability" value="64%" icon={<Target className="h-4 w-4 text-[#4f46e5]" />} description="SDE-1 Roles" />
            <MetricCard title="Resume ATS Score" value="78/100" icon={<BrainCircuit className="h-4 w-4 text-[#F26522]" />} description="Good fit" />
          </div>

          <div className="liquid-glass rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/dashboard/resume-intelligence" className="group p-5 rounded-2xl bg-white/60 hover:bg-white transition-all border border-gray-200 shadow-sm flex flex-col items-start gap-4 cursor-pointer">
                <div className="p-2.5 rounded-full bg-[#4f46e5]/10 text-[#4f46e5] group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Analyze Resume</p>
                  <p className="text-xs text-gray-500">Upload PDF for AI insights</p>
                </div>
              </Link>
              
              <Link href="/dashboard/career-twin" className="group p-5 rounded-2xl bg-white/60 hover:bg-white transition-all border border-gray-200 shadow-sm flex flex-col items-start gap-4 cursor-pointer">
                <div className="p-2.5 rounded-full bg-[#F26522]/10 text-[#F26522] group-hover:scale-110 transition-transform">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Career Twin</p>
                  <p className="text-xs text-gray-500">View 12-month trajectory</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - Video */}
        <div className="relative hidden lg:block rounded-3xl overflow-hidden min-h-[400px] lg:h-auto border border-gray-200 shadow-sm">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover scale-[1.02]"
            onTimeUpdate={() => {
              if (videoRef.current && videoRef.current.currentTime >= 3.53) {
                videoRef.current.pause();
              }
            }}
          >
            <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_214311_24de0b75-7eaa-4f42-86d8-8c2014ca2851.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* Bottom Full Width - Recommended Actions */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Next Recommended Actions</h3>
          <p className="text-sm text-gray-500 mt-1">AI-generated tasks to boost your score</p>
        </div>
        <ul className="grid sm:grid-cols-3 gap-4">
          <ActionItem text="Complete a System Design mock interview" time="Est. 45 mins" />
          <ActionItem text="Add your latest Hackathon project to your resume" time="Est. 10 mins" />
          <ActionItem text="Learn Advanced React Patterns (Missing Skill)" time="Est. 2 hours" />
        </ul>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) {
  return (
    <div className="liquid-glass rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex flex-row items-center justify-between pb-2">
        <span className="text-sm font-medium text-gray-600 tracking-tight">{title}</span>
        <div className="bg-white p-1.5 rounded-full shadow-sm">{icon}</div>
      </div>
      <div>
        <div className="text-3xl font-semibold text-gray-900 mt-2 tracking-tight">{value}</div>
        <p className="text-[12px] font-medium text-gray-500 mt-2">{description}</p>
      </div>
    </div>
  );
}

function ActionItem({ text, time }: { text: string, time: string }) {
  return (
    <li className="flex items-start gap-3 bg-white/60 p-3 rounded-xl border border-white/40 shadow-sm">
      <div className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-[#F26522]" />
      <div className="flex-1 flex flex-col">
        <span className="text-[14px] font-medium text-gray-900 leading-snug">{text}</span>
        <span className="text-[12px] text-gray-500 mt-1">{time}</span>
      </div>
    </li>
  );
}
