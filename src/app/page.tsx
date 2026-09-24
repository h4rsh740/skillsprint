"use client";

import React, { useState, useEffect, useRef } from "react";
import { Shader, ChromaFlow, FilmGrain, FlutedGlass, Swirl } from "shaders/react";
import {
  ArrowRight,
  BrainCircuit,
  Menu,
  X,
  Clock,
  Zap,
  TrendingUp,
  Mic,
  FileSearch,
  Star,
  ChevronRight,
  Sparkles,
  Shield,
  Users,
  Award,
} from "lucide-react";

/* ─── Animated Counter Hook ─── */
function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

/* ─── Stat Card ─── */
function StatCard({ value, suffix, label, startAnim }: { value: number; suffix: string; label: string; startAnim: boolean }) {
  const count = useCountUp(value, 2000, startAnim);
  return (
    <div className="ss-glass-card flex flex-col items-center justify-center py-8 px-6 rounded-2xl text-center">
      <span className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
        {count}<span style={{ color: "#A78BFA" }}>{suffix}</span>
      </span>
      <span className="mt-2 text-xs font-medium uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Feature Card ─── */
type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
function FeatureCard({ icon: Icon, title, description, accent, href, tag }: { icon: IconComponent; title: string; description: string; accent: string; href: string; tag?: string }) {
  return (
    <a href={href} className="ss-feature-card group relative flex flex-col rounded-2xl p-6 overflow-hidden cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40" style={{ background: accent }} />
      <div className="relative z-10 flex flex-col flex-1">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        {tag && (
          <span className="self-start text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full mb-3" style={{ background: `${accent}22`, color: accent }}>
            {tag}
          </span>
        )}
        <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm leading-relaxed flex-1" style={{ color: "rgba(255,255,255,0.45)" }}>{description}</p>
        <div className="mt-5 flex items-center gap-1.5 text-xs font-medium" style={{ color: accent }}>
          Explore <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </a>
  );
}

/* ─── Testimonial Card ─── */
function TestimonialCard({ quote, name, role, initials, color }: { quote: string; name: string; role: string; initials: string; color: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl p-6 min-w-[280px] sm:min-w-[320px] flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex gap-0.5">
        {[0,1,2,3,4].map(i => <Star key={i} className="w-3.5 h-3.5" style={{ fill: "#F59E0B", color: "#F59E0B" }} />)}
      </div>
      <p className="text-sm leading-relaxed italic" style={{ color: "rgba(255,255,255,0.6)" }}>"{quote}"</p>
      <div className="flex items-center gap-3 mt-auto pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{role}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [londonTime, setLondonTime] = useState("");
  const [showIntroVideo, setShowIntroVideo] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const options: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true };
      setLondonTime(new Intl.DateTimeFormat("en-IN", options).format(new Date()).toUpperCase());
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setStatsVisible(true); }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const features = [
    { icon: TrendingUp, title: "AI Career Twin", description: "A digital clone projecting your professional future based on your skill velocity and learning habits.", accent: "#7C3AED", href: "/dashboard/career-twin", tag: "Predictive AI" },
    { icon: Mic, title: "Mock Interview Agent", description: "Voice-enabled AI evaluator for HR, Technical, and System Design rounds with real-time feedback.", accent: "#0891B2", href: "/dashboard/mock-interview", tag: "Live Voice AI" },
    { icon: FileSearch, title: "Resume Intelligence", description: "Deep resume analysis with ATS scoring, gap detection, and targeted improvement recommendations.", accent: "#059669", href: "/dashboard/resume-intel", tag: "ATS Optimized" },
    { icon: Zap, title: "Placement Readiness", description: "Real-time readiness score across technical, behavioral, and domain-specific dimensions.", accent: "#D97706", href: "/dashboard", tag: "Smart Scoring" },
  ];

  const testimonials = [
    { quote: "SkillSprint's AI mock interviews helped me crack Amazon. The feedback was brutally honest and exactly what I needed.", name: "Arjun Mehta", role: "SDE-2 @ Amazon", initials: "AM", color: "#7C3AED" },
    { quote: "The Career Twin predicted I'd be placement-ready in 6 weeks. I got an offer in 5. The accuracy is unreal.", name: "Priya Sharma", role: "Data Engineer @ Flipkart", initials: "PS", color: "#0891B2" },
    { quote: "Resume Intel found 12 ATS issues I had no idea about. Fixed them all and started getting callbacks immediately.", name: "Rohan Iyer", role: "Frontend Engineer @ Swiggy", initials: "RI", color: "#059669" },
    { quote: "Best placement prep tool I've used. The structured roadmap keeps me accountable every single day.", name: "Sneha Gupta", role: "Product Manager @ Razorpay", initials: "SG", color: "#D97706" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Open Sans', sans-serif; background: #0D0B1E; color: #fff; margin: 0; }
        h1,h2,h3,h4 { font-family: 'Poppins', sans-serif; }
        .ss-glass-card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
        .ss-gradient-text { background: linear-gradient(135deg, #fff 30%, #A78BFA 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .ss-glow-btn { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); transition: box-shadow 0.3s ease, transform 0.2s ease; }
        .ss-glow-btn:hover { box-shadow: 0 0 28px 6px rgba(124,58,237,0.3); transform: translateY(-1px); }
        .ss-feature-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .ss-feature-card:hover { transform: translateY(-4px); box-shadow: 0 20px 48px rgba(0,0,0,0.4); }
        .ss-testimonial-track { display: flex; gap: 20px; animation: scroll-left 32s linear infinite; }
        .ss-testimonial-track:hover { animation-play-state: paused; }
        @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .ss-fade-up { animation: fade-up 0.7s ease both; }
        .ss-d1 { animation-delay: 0.1s; }
        .ss-d2 { animation-delay: 0.24s; }
        .ss-d3 { animation-delay: 0.38s; }
        .ss-d4 { animation-delay: 0.52s; }
        @media (prefers-reduced-motion: reduce) { .ss-fade-up, .ss-testimonial-track, .ss-glow-btn, .ss-feature-card { animation: none !important; transition: none !important; transform: none !important; } }
      `}</style>

      {/* Intro Video */}
      {showIntroVideo && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
          <video src="/intro-video.mp4" autoPlay muted playsInline onEnded={() => setShowIntroVideo(false)} className="w-full h-full object-contain sm:object-cover" />
          <button onClick={() => setShowIntroVideo(false)} className="absolute bottom-10 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full text-sm font-medium backdrop-blur-md transition-all border border-white/20">
            Skip Intro
          </button>
        </div>
      )}

      <div style={{ background: "#0D0B1E", minHeight: "100vh" }}>

        {/* ── Navbar ── */}
        <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ background: scrolled ? "rgba(13,11,30,0.9)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#7C3AED" }}>
                <BrainCircuit style={{ width: 18, height: 18, color: "#fff" }} />
              </div>
              <span className="font-bold text-white text-[15px]" style={{ fontFamily: "Poppins, sans-serif" }}>SkillSprint</span>
            </a>
            <nav className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5" style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.1)" }}>
                <Clock style={{ width: 12, height: 12 }} /><span className="font-medium">{londonTime} IST</span>
              </div>
              <a href="/auth/signin" className="text-sm font-medium transition-colors" style={{ color: "rgba(255,255,255,0.6)" }} onMouseOver={e => (e.currentTarget.style.color="#fff")} onMouseOut={e => (e.currentTarget.style.color="rgba(255,255,255,0.6)")}>Sign In</a>
              <a href="/auth/signup" className="ss-glow-btn group flex items-center gap-2 text-sm font-semibold text-white rounded-full px-5 py-2.5" style={{ background: "#7C3AED" }}>
                Get Started <ArrowRight style={{ width: 14, height: 14 }} />
              </a>
            </nav>
            <button className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center" style={{ border: "1px solid rgba(255,255,255,0.1)" }} onClick={() => setIsMobileMenuOpen(true)}>
              <Menu style={{ width: 16, height: 16, color: "#fff" }} />
            </button>
          </div>
        </header>

        {/* Mobile Menu */}
        <div className={`fixed inset-0 z-[60] flex flex-col justify-end transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setIsMobileMenuOpen(false)} />
          <div className={`relative rounded-t-3xl p-8 flex flex-col gap-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileMenuOpen ? "translate-y-0" : "translate-y-full"}`} style={{ background: "#13102A", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5" style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.1)" }}>
                <Clock style={{ width: 12, height: 12 }} /><span>{londonTime} IST</span>
              </div>
              <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} onClick={() => setIsMobileMenuOpen(false)}>
                <X style={{ width: 16, height: 16, color: "#fff" }} />
              </button>
            </div>
            <a href="/auth/signin" className="text-2xl font-semibold text-white" style={{ fontFamily: "Poppins, sans-serif" }}>Sign In</a>
            <a href="/auth/signup" className="ss-glow-btn flex items-center justify-center gap-2 text-sm font-semibold text-white rounded-2xl py-4" style={{ background: "#7C3AED" }}>
              Get Started <ArrowRight style={{ width: 16, height: 16 }} />
            </a>
          </div>
        </div>

        {/* ── HERO ── */}
        <section className="relative min-h-screen flex flex-col overflow-hidden pt-16">
          {/* Shader bg – desktop */}
          <div className="absolute inset-0 z-0 hidden md:block">
            <Shader>
              <Swirl colorA="#0D0B1E" colorB="#1a1040" detail={1.4} />
              <ChromaFlow baseColor="#0D0B1E" downColor="#2d1b69" leftColor="#1e3a5f" rightColor="#3b1f6b" upColor="#1a1040" momentum={10} radius={4} />
              <FlutedGlass aberration={0.5} angle={25} frequency={6} highlight={0.08} highlightSoftness={0} lightAngle={-90} refraction={3} shape="rounded" softness={1} speed={0.1} />
              <FilmGrain strength={0.04} />
            </Shader>
          </div>
          {/* Gradient bg – mobile */}
          <div className="absolute inset-0 z-0 md:hidden" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, #2d1b69 0%, #0D0B1E 70%)" }} />
          {/* Glow orbs */}
          <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-10 blur-[120px] pointer-events-none" style={{ background: "#7C3AED" }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-[100px] pointer-events-none" style={{ background: "#0891B2" }} />

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-24 sm:py-32">
            {/* Badge */}
            <div className="ss-fade-up ss-glass-card inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8">
              <Sparkles style={{ width: 14, height: 14, color: "#A78BFA" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#A78BFA" }}>SkillSprint AI 1.0 · Beta</span>
            </div>

            {/* H1 */}
            <h1 className="ss-fade-up ss-d1 ss-gradient-text font-extrabold leading-[1.07] tracking-[-0.03em] max-w-3xl" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)" }}>
              Predict Your Career<br className="hidden sm:block" /> Before It Happens.
            </h1>

            <p className="ss-fade-up ss-d2 mt-6 text-base sm:text-lg max-w-xl leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              AI-powered placement prep — from predictive modeling and resume intelligence to live mock interviews — all in one platform.
            </p>

            <div className="ss-fade-up ss-d3 mt-10 flex flex-col sm:flex-row items-center gap-4">
              <a href="/auth/signup" className="ss-glow-btn group flex items-center gap-2.5 text-sm font-semibold text-white rounded-full px-7 py-3.5" style={{ background: "#7C3AED" }}>
                Start your journey
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <ArrowRight style={{ width: 12, height: 12 }} />
                </div>
              </a>
              <a href="/auth/signin" className="group flex items-center gap-1.5 text-sm font-medium transition-colors" style={{ color: "rgba(255,255,255,0.5)" }} onMouseOver={e => (e.currentTarget.style.color="#fff")} onMouseOut={e => (e.currentTarget.style.color="rgba(255,255,255,0.5)")}>
                Already have an account? <ChevronRight style={{ width: 14, height: 14 }} />
              </a>
            </div>

            {/* Trust strip */}
            <div className="ss-fade-up ss-d4 mt-12 flex flex-wrap items-center justify-center gap-8">
              {[{ icon: Shield, label: "SOC 2 Compliant" }, { icon: Users, label: "5,000+ Students" }, { icon: Award, label: "98% Satisfaction" }].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <Icon style={{ width: 13, height: 13, opacity: 0.5 }} />{label}
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="relative z-10 flex justify-center pb-8">
            <div className="flex flex-col items-center animate-bounce">
              <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.2))" }} />
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="py-16 sm:py-20" style={{ background: "#0D0B1E" }}>
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard value={5000} suffix="+" label="Students" startAnim={statsVisible} />
              <StatCard value={93} suffix="%" label="Placement Rate" startAnim={statsVisible} />
              <StatCard value={120} suffix="+" label="Companies" startAnim={statsVisible} />
              <StatCard value={4} suffix="x" label="Faster Readiness" startAnim={statsVisible} />
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="py-20 sm:py-28" style={{ background: "linear-gradient(180deg, #0D0B1E 0%, #100d25 100%)" }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: "#7C3AED" }}>2</div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Platform Features</span>
            </div>
            <h2 className="font-bold leading-[1.1] tracking-[-0.025em] text-white mb-4 max-w-xl" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>Core Intelligence</h2>
            <p className="text-base max-w-lg mb-14 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>Four integrated AI engines working together to accelerate your path from campus to career.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map(f => <FeatureCard key={f.title} {...f} />)}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-20 sm:py-28" style={{ background: "#0D0B1E" }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: "#0891B2" }}>3</div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>How It Works</span>
            </div>
            <h2 className="font-bold leading-[1.1] tracking-[-0.025em] text-white mb-16 max-w-xl" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>Three steps to placement-ready</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { step: "01", title: "Assess Your Baseline", desc: "Complete a quick diagnostic. Our AI maps your skill gaps, strengths, and placement velocity score.", color: "#7C3AED" },
                { step: "02", title: "Train with AI Agents", desc: "Practice interviews, optimize your resume, and follow a personalized roadmap — all powered by AI.", color: "#0891B2" },
                { step: "03", title: "Land Your Offer", desc: "Track your readiness in real-time and get notified when you hit the threshold to apply confidently.", color: "#059669" },
              ].map(({ step, title, desc, color }) => (
                <div key={step} className="flex flex-col gap-4">
                  <div className="text-5xl font-extrabold leading-none" style={{ color: `${color}30`, fontFamily: "Poppins, sans-serif" }}>{step}</div>
                  <div className="w-8 h-px" style={{ background: color }} />
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="py-20 sm:py-28 overflow-hidden" style={{ background: "linear-gradient(180deg, #0D0B1E 0%, #100d25 100%)" }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8 mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: "#D97706" }}>4</div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Social Proof</span>
            </div>
            <h2 className="font-bold leading-[1.1] tracking-[-0.025em] text-white max-w-xl" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}>Students who made it</h2>
          </div>
          <div className="overflow-hidden">
            <div className="ss-testimonial-track px-5 sm:px-8 w-max">
              {[...testimonials, ...testimonials].map((t, i) => <TestimonialCard key={i} {...t} />)}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section className="py-20 px-5 sm:px-8" style={{ background: "#0D0B1E" }}>
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center" style={{ background: "linear-gradient(135deg, #2d1b69 0%, #1e3a5f 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-48 opacity-30 blur-3xl rounded-full" style={{ background: "#7C3AED" }} />
              <div className="relative z-10">
                <h2 className="font-bold text-white mb-4 leading-tight" style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}>Ready to predict your placement?</h2>
                <p className="text-base mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>Join 5,000+ students who are using SkillSprint to land their dream roles faster.</p>
                <a href="/auth/signup" className="ss-glow-btn inline-flex items-center gap-2.5 text-sm font-semibold text-white rounded-full px-8 py-4" style={{ background: "#7C3AED" }}>
                  Get started for free <ArrowRight style={{ width: 16, height: 16 }} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-12 px-5 sm:px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0D0B1E" }}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#7C3AED" }}>
                <BrainCircuit style={{ width: 15, height: 15, color: "#fff" }} />
              </div>
              <span className="font-bold text-white text-sm" style={{ fontFamily: "Poppins, sans-serif" }}>SkillSprint</span>
            </div>
            <nav className="flex flex-wrap gap-6">
              {[{ label: "Sign In", href: "/auth/signin" }, { label: "Get Started", href: "/auth/signup" }, { label: "Dashboard", href: "/dashboard" }].map(({ label, href }) => (
                <a key={label} href={href} className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.3)" }} onMouseOver={e => (e.currentTarget.style.color="rgba(255,255,255,0.7)")} onMouseOut={e => (e.currentTarget.style.color="rgba(255,255,255,0.3)")}>{label}</a>
              ))}
            </nav>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>© {new Date().getFullYear()} SkillSprint. All rights reserved.</p>
          </div>
        </footer>

      </div>
    </>
  );
}
