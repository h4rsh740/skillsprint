"use client";

import React, { useState, useEffect } from "react";
import { Shader, ChromaFlow, FilmGrain, FlutedGlass, Swirl } from "shaders/react";
import { Clock, Menu, X, ArrowRight, BrainCircuit } from "lucide-react";

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [londonTime, setLondonTime] = useState("");

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

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#F26522] selection:text-white">
      {/* SECTION 1: HERO */}
      <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#EFEFEF]">
        {/* Shaders Background */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <Shader>
            <Swirl colorA="#ffffff" colorB="#e0e7ff" detail={1.7} />
            <ChromaFlow baseColor="#ffffff" downColor="#4f46e5" leftColor="#3b82f6" rightColor="#8b5cf6" upColor="#6366f1" momentum={13} radius={3.5} />
            <FlutedGlass aberration={0.61} angle={31} frequency={8} highlight={0.12} highlightSoftness={0} lightAngle={-90} refraction={4} shape="rounded" softness={1} speed={0.15} />
            <FilmGrain strength={0.05} />
          </Shader>
        </div>

        {/* Navigation */}
        <div className="relative z-20 w-full max-w-[1440px] mx-auto p-2 sm:p-3 mt-4">
          <nav className="flex items-center justify-between bg-white/90 backdrop-blur-md rounded-full p-[5px] shadow-sm">
            {/* Left side */}
            <div className="flex items-center gap-6">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-900 rounded-full flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:flex items-center gap-6 ml-2">
                {["Career Twin", "Resume Intel", "Mock Interviews", "For Recruiters"].map((link) => (
                  <a key={link} href={`/dashboard`} className="text-[14px] font-medium text-gray-900 hover:text-[#4f46e5] transition-colors duration-300">
                    {link}
                  </a>
                ))}
              </div>
            </div>

            {/* Right side (Desktop) */}
            <div className="hidden md:flex items-center gap-6">
              <span className="text-[13px] text-gray-600 hidden lg:block">Ready for Placement Q1 2026</span>
              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 h-4">
                <Clock className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-[13px] text-gray-600 font-medium">{londonTime} IST</span>
              </div>
              <a href="/dashboard" className="group flex items-center gap-2 bg-gray-900 text-white text-[13px] font-medium rounded-full pl-5 pr-2 py-2 hover:bg-gray-800 transition-colors">
                <div className="h-[20px] overflow-hidden relative">
                  <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                    <span className="h-[20px] flex items-center">Get Started</span>
                    <span className="h-[20px] flex items-center">Get Started</span>
                  </div>
                </div>
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-gray-900 transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45" />
                </div>
              </a>
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
        <div className={`fixed inset-0 z-50 flex flex-col justify-end transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
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
              {["Career Twin", "Resume Intel", "Mock Interviews", "For Recruiters"].map((link) => (
                <a key={link} href="/dashboard" className="text-[28px] leading-[32px] font-medium text-gray-900 tracking-tight">
                  {link}
                </a>
              ))}
            </nav>
            <a href="/dashboard" className="flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] transition-colors text-white text-[15px] font-medium rounded-full p-4 w-full">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Hero Content */}
        <div className="flex-1" />
        <div className="relative z-20 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pb-14 sm:pb-16 lg:pb-20">
          <p className="text-[13px] sm:text-[14px] text-gray-900 tracking-wide font-medium mb-5 sm:mb-8 uppercase">
            SkillSprint AI 1.0
          </p>
          <h1 className="text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 max-w-5xl drop-shadow-sm">
            Predict Your Career <br className="hidden sm:block" /><span className="sm:hidden"> </span>
            Before It Happens <br className="hidden sm:block" /><span className="sm:hidden"> </span>
            Online.
          </h1>
          
          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            <a href="/dashboard" className="group flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] sm:text-[14px] font-medium rounded-full pl-5 sm:pl-6 pr-2 py-2 transition-colors">
              <div className="h-[20px] overflow-hidden relative">
                <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                  <span className="h-[20px] flex items-center">Start your journey</span>
                  <span className="h-[20px] flex items-center">Start your journey</span>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#4f46e5] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45" />
              </div>
            </a>

            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-[4px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow duration-300">
              <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 text-[#8b5cf6]" />
              <span className="text-[13px] sm:text-[14px] font-medium text-gray-900">AI Powered Platform</span>
              <span className="text-[10px] sm:text-[11px] bg-[#4f46e5] text-white px-1.5 sm:px-2 py-0.5 rounded ml-1">Beta</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: ABOUT */}
      <section className="bg-white pt-16 sm:pt-20 lg:pt-32 pb-12 sm:pb-16 lg:pb-24 overflow-hidden w-full">
        <div className="w-full max-w-[1440px] mx-auto">
          {/* Badge row */}
          <div className="px-5 sm:px-8 lg:px-12 flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#4f46e5] text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
              1
            </div>
            <div className="border border-gray-200 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-[12px] sm:text-[13px] font-medium text-gray-900">
              Introducing SkillSprint
            </div>
          </div>

          <div className="px-5 sm:px-8 lg:px-12">
            <h2 className="text-[clamp(1.5rem,4vw,3.2rem)] font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 mb-12 sm:mb-16 lg:mb-28 max-w-4xl">
              Your AI Career Twin, <br className="hidden sm:block" />
              navigating your path from student to hired.
            </h2>
          </div>

          {/* Content area responsive */}
          <div className="px-5 sm:px-8 lg:px-12">
            {/* MOBILE/TABLET layout */}
            <div className="lg:hidden flex flex-col space-y-8">
              <div>
                <p className="text-[15px] sm:text-[17px] leading-[1.6] font-medium text-gray-900 mb-6 max-w-md">
                  Through predictive modeling, resume intelligence and AI mock interviews we help students realize their true placement potential.
                </p>
                <a href="/dashboard" className="group inline-flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13px] sm:text-[14px] font-medium rounded-full pl-5 sm:pl-6 pr-2 py-2 transition-colors">
                  <div className="h-[20px] overflow-hidden relative">
                    <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                      <span className="h-[20px] flex items-center">Explore features</span>
                      <span className="h-[20px] flex items-center">Explore features</span>
                    </div>
                  </div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#4f46e5] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45" />
                  </div>
                </a>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 w-full">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" 
                  alt="Dashboard Data" 
                  className="w-full sm:w-[45%] aspect-[438/346] object-cover rounded-xl sm:rounded-2xl"
                />
                <img 
                  src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop" 
                  alt="Students Tech" 
                  className="w-full sm:w-[55%] aspect-[900/600] object-cover rounded-xl sm:rounded-2xl"
                />
              </div>
            </div>

            {/* DESKTOP layout */}
            <div className="hidden lg:grid grid-cols-[26%_1fr_48%] items-end gap-6 xl:gap-8">
              <div className="self-end w-full">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" 
                  alt="Dashboard Data" 
                  className="w-full aspect-[438/346] object-cover rounded-2xl"
                />
              </div>
              <div className="self-start flex flex-col items-end pr-4 xl:pr-10">
                <p className="text-[16px] xl:text-[18px] leading-[1.65] font-medium text-gray-900 whitespace-nowrap mb-8 text-right">
                  Through predictive modeling, resume intelligence<br/>and AI mock interviews we help students<br/>realize their true placement potential.
                </p>
                <a href="/dashboard" className="group inline-flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[14px] font-medium rounded-full pl-6 pr-2 py-2 transition-colors">
                  <div className="h-[20px] overflow-hidden relative">
                    <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                      <span className="h-[20px] flex items-center">Explore features</span>
                      <span className="h-[20px] flex items-center">Explore features</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 text-[#4f46e5] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45" />
                  </div>
                </a>
              </div>
              <div className="self-end w-full">
                <img 
                  src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop" 
                  alt="Students Tech" 
                  className="w-full aspect-[3/2] object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CASE STUDIES */}
      <section className="bg-[#F5F5F5] pt-16 sm:pt-20 lg:pt-28 pb-16 sm:pb-20 lg:pb-28 w-full">
        <div className="w-full max-w-[1440px] mx-auto">
          {/* Badge row */}
          <div className="px-5 sm:px-8 lg:px-12 flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#8b5cf6] text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
              2
            </div>
            <div className="border border-gray-300 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-[12px] sm:text-[13px] font-medium text-gray-900">
              Platform Features
            </div>
          </div>

          <div className="px-5 sm:px-8 lg:px-12">
            <h2 className="text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 mb-10 sm:mb-14 lg:mb-16">
              Core Intelligence
            </h2>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-7 px-5 sm:px-8 lg:px-12">
            {/* Card 1 */}
            <div className="flex flex-col">
              <a href="/dashboard/career-twin" className="relative aspect-[329/246] rounded-2xl overflow-hidden bg-[#1a1d2e] group cursor-pointer mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1d2e]/80 to-transparent" />
                <div className="absolute bottom-4 left-4 h-9 w-9 bg-white rounded-full flex items-center justify-end pr-[11px] group-hover:w-[148px] transition-all duration-300 ease-in-out shadow-sm overflow-hidden">
                  <span className="text-[13px] font-medium text-gray-900 whitespace-nowrap absolute left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    View predictions
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-900 transform -rotate-45 group-hover:rotate-0 transition-transform duration-300 ease-in-out relative z-10 flex-shrink-0" />
                </div>
              </a>
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-gray-900 mt-1">AI Career Twin</h3>
              <p className="text-[13px] sm:text-[14px] text-gray-600 mt-2 leading-relaxed">
                A digital clone projecting your professional future based on current velocity and learning habits.
              </p>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col">
              <a href="/dashboard/mock-interview" className="relative aspect-square rounded-2xl overflow-hidden bg-[#6b6b6b] group cursor-pointer mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop" 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                <div className="absolute bottom-4 left-4 h-9 w-9 bg-[#8b5cf6] rounded-full flex items-center justify-end pr-[11px] group-hover:w-[168px] transition-all duration-300 ease-in-out shadow-sm overflow-hidden">
                  <span className="text-[13px] font-medium text-white whitespace-nowrap absolute left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    Start interview
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-white transform -rotate-45 group-hover:rotate-0 transition-transform duration-300 ease-in-out relative z-10 flex-shrink-0" />
                </div>
              </a>
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-gray-900 mt-1">Mock Interview Agent</h3>
              <p className="text-[13px] sm:text-[14px] text-gray-600 mt-2 leading-relaxed">
                Practice real-time HR, Technical, and System Design interviews with a voice-enabled AI evaluating you.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
