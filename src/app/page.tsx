"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const WebGLScene = dynamic(() => import("@/components/WebGLScene"), { ssr: false });

export default function LandingPage() {
  const [showIntroVideo, setShowIntroVideo] = useState(true);

  const splitTitles = useCallback(() => {
    document.querySelectorAll(".ss-slide-title").forEach((title) => {
      if ((title as HTMLElement).dataset.split) return;
      (title as HTMLElement).dataset.split = "1";
      let html = "", delay = 0;
      (title as HTMLElement).innerHTML
        .split(/(<br\s*\/?>)/i)
        .forEach((part) => {
          if (part.toLowerCase().startsWith("<br")) html += part;
          else
            for (let i = 0; i < part.length; i++) {
              if (part[i] === " ") html += " ";
              else
                html += `<span class="ss-char" style="transition-delay:${delay++ * 0.035}s">${part[i]}</span>`;
            }
        });
      (title as HTMLElement).innerHTML = html;
    });
  }, []);

  const handleSlidesUpdate = useCallback((scroll: number) => {
    for (let i = 1; i <= 4; i++) {
      const f = document.getElementById("ss-dash-fill-" + i);
      if (f) {
        const s = (i - 1) * 0.25, e = i * 0.25;
        f.style.height = (Math.max(0, Math.min(1, (scroll - s) / (e - s))) * 100).toFixed(2) + "%";
      }
    }
    const inRange = (v: number, a: number, b: number) => v >= a && v <= b;
    document.getElementById("ss-slide-1")?.classList.toggle("ss-active", inRange(scroll, -0.1, 0.12));
    const a2 = inRange(scroll, 0.28, 0.4);
    document.getElementById("ss-slide-2")?.classList.toggle("ss-active", a2);
    document.getElementById("ss-slide-2-img")?.classList.toggle("ss-active", a2);
    document.getElementById("ss-slide-3")?.classList.toggle("ss-active", inRange(scroll, 0.56, 0.68));
    document.getElementById("ss-slide-4")?.classList.toggle("ss-active", inRange(scroll, 0.84, 1.05));
  }, []);

  const handleSectionUpdate = useCallback((scroll: number) => {
    const body = document.body;
    const sec = scroll < .25 ? 1 : scroll < .5 ? 2 : scroll < .75 ? 3 : 4;
    if (body.dataset.section !== String(sec)) body.dataset.section = String(sec);
  }, []);

  const handleDotsUpdate = useCallback((scroll: number) => {
    document.querySelectorAll(".ss-grid-dot").forEach((d, i) => {
      let s = 90 + ((i * 55) % 180);
      if (i % 2 === 0) s = -s;
      (d as HTMLElement).style.top =
        ((((i * 17) % 80 + 10 + scroll * s) % 100 + 100) % 100).toFixed(2) + "%";
    });
  }, []);

  useEffect(() => {
    if (showIntroVideo) return;
    splitTitles();
    // Nav smooth scroll
    const targets = [0, 0.34, 0.62, 0.94];
    const links = document.querySelectorAll(".ss-nav-link");
    const handlers: ((e: Event) => void)[] = [];
    links.forEach((l, i) => {
      const h = (e: Event) => {
        e.preventDefault();
        window.scrollTo({
          top: (document.documentElement.scrollHeight - innerHeight) * targets[i],
          behavior: "smooth",
        });
      };
      handlers.push(h);
      l.addEventListener("click", h);
    });
    return () => links.forEach((l, i) => l.removeEventListener("click", handlers[i]));
  }, [showIntroVideo, splitTitles]);

  if (showIntroVideo) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
        <video
          src="/intro-video.mp4"
          autoPlay muted playsInline
          onEnded={() => setShowIntroVideo(false)}
          className="w-full h-full object-contain sm:object-cover"
        />
        <button
          onClick={() => setShowIntroVideo(false)}
          className="absolute bottom-10 sm:bottom-auto sm:top-6 right-6 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 px-5 py-2.5 sm:px-4 sm:py-2 rounded-full text-[14px] sm:text-sm font-medium backdrop-blur-md transition-all border border-white/20"
        >
          Skip Intro
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .ss-root{min-height:900vh;font-family:'Inter','Helvetica Neue',sans-serif;color:#0F0A1E;overflow-x:hidden;cursor:none;background:#FAFAFA;}
        .ss-root *{cursor:none!important;box-sizing:border-box;user-select:none;}
        ::-webkit-scrollbar{display:none;width:0;}
        .ss-cursor-inner{position:fixed;top:0;left:0;width:6px;height:6px;border:2px solid rgba(167,139,250,1);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:9999;}
        .ss-cursor-outer{position:fixed;top:0;left:0;width:40px;height:40px;border:1.5px solid rgba(167,139,250,.6);border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:9998;transition:width .3s,height .3s;}
        .ss-cinematic{position:fixed;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;padding:0 60px 40px 60px;}
        .ss-header{display:flex;justify-content:space-between;align-items:center;width:100%;z-index:20;pointer-events:auto;padding:20px 0;}
        .ss-brand{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;letter-spacing:.5px;color:var(--ss-text-brand,#0F0A1E);text-decoration:none;transition:color .6s;}
        .ss-brand-icon{color:var(--ss-nav-hover,#7C3AED);transition:color .6s;}
        .ss-nav{display:flex;align-items:center;gap:24px;}
        .ss-nav-link{color:var(--ss-text-nav,rgba(15,10,30,.5));text-decoration:none;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;font-weight:500;transition:color .3s;}
        .ss-nav-link:hover{color:var(--ss-nav-hover,#7C3AED);}
        .ss-nav-dot{width:3px;height:3px;background:rgba(124,58,237,.25);border-radius:50%;}
        .ss-header-actions{display:flex;align-items:center;gap:10px;}
        .ss-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 10px 9px 20px;border-radius:999px;font-size:13px;font-weight:600;text-decoration:none;transition:transform .3s,box-shadow .3s;pointer-events:auto;}
        .ss-btn-dark{background:#0F0A1E;color:#fff;}.ss-btn-dark:hover{background:#1a1230;transform:translateY(-1px);}
        .ss-btn-primary{background:linear-gradient(135deg,#7C3AED,#6D28D9);color:#fff;box-shadow:0 0 20px rgba(124,58,237,.4);}.ss-btn-primary:hover{transform:translateY(-2px);box-shadow:0 0 32px rgba(124,58,237,.65);}
        .ss-btn-text{height:20px;overflow:hidden;position:relative;}
        .ss-btn-inner{display:flex;flex-direction:column;transition:transform 500ms cubic-bezier(.25,.1,.25,1);}
        .ss-btn:hover .ss-btn-inner{transform:translateY(-50%);}
        .ss-btn-inner span{height:20px;display:flex;align-items:center;white-space:nowrap;}
        .ss-btn-icon{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .ss-icon-dark{background:#fff;}.ss-icon-light{background:rgba(255,255,255,.2);}
        .ss-arrow{width:12px;height:12px;transition:transform 500ms cubic-bezier(.25,.1,.25,1);}
        .ss-btn:hover .ss-arrow{transform:rotate(-45deg);}
        .ss-slide{position:absolute;bottom:12%;pointer-events:none;}
        #ss-slide-1{left:0;width:100%;}
        #ss-slide-1 .ss-slide-title{margin-left:60px;}
        #ss-slide-1 .ss-desc-row{position:relative;display:flex;width:100%;}
        #ss-slide-1 .ss-col-1{margin-left:60px;width:calc(25vw - 60px);max-width:calc(25vw - 60px);}
        #ss-slide-1 .ss-col-2{position:absolute;left:calc(25vw + 40px);width:calc(25vw - 60px);max-width:calc(25vw - 60px);}
        #ss-slide-2{left:0;width:100%;}
        #ss-slide-2-img{position:fixed;top:90px;left:60px;width:calc(25vw - 60px);aspect-ratio:1/1;overflow:hidden;z-index:2;pointer-events:none;clip-path:inset(0 0 100% 0);transition:clip-path 1.8s cubic-bezier(.16,1,.3,1),opacity .8s ease;opacity:0;border-radius:16px;}
        #ss-slide-2-img img{width:100%;height:100%;object-fit:cover;transform:scale(1.15);transition:transform 1.8s cubic-bezier(.16,1,.3,1);}
        #ss-slide-2-img.ss-active{clip-path:inset(0 0 0 0);opacity:1;}
        #ss-slide-2-img.ss-active img{transform:scale(1);}
        #ss-slide-2 .ss-slide-title{margin-left:calc(25vw + 40px);}
        #ss-slide-2 .ss-slide-desc{margin-left:calc(50vw + 20px);width:calc(25vw - 60px);max-width:calc(25vw - 60px);}
        #ss-slide-3{left:calc(50vw + 20px);width:calc(25vw - 60px);max-width:calc(25vw - 60px);}
        #ss-slide-3 .ss-slide-title{white-space:nowrap;}
        #ss-slide-4{left:calc(25% + 40px);max-width:750px;}
        .ss-slide-title{font-family:'Italiana',Georgia,serif;font-size:clamp(56px,7vw,96px);line-height:1;font-weight:400;letter-spacing:2px;margin-bottom:20px;color:var(--ss-text-primary,#0F0A1E);transition:color .6s;}
        .ss-slide-desc{font-size:16px;line-height:1.7;font-weight:300;color:var(--ss-text-desc,rgba(15,10,30,.55));letter-spacing:.5px;opacity:0;transform:translateY(30px);transition:opacity .8s cubic-bezier(.25,1,.5,1),transform .8s cubic-bezier(.25,1,.5,1),color .6s;transition-delay:.4s;}
        .ss-slide.ss-active .ss-slide-desc{opacity:1;transform:translateY(0);}
        .ss-slide-title .ss-char{display:inline-block;opacity:0;transform:translateY(50px);filter:blur(12px);transition:opacity .8s cubic-bezier(.25,1,.5,1),transform .8s cubic-bezier(.25,1,.5,1),filter .8s cubic-bezier(.25,1,.5,1);}
        .ss-slide.ss-active .ss-slide-title .ss-char{opacity:1;transform:translateY(0);filter:blur(0);}
        .ss-slide.ss-active{pointer-events:auto;}
        .ss-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--ss-text-eyebrow,rgba(124,58,237,.7));margin-bottom:18px;opacity:0;transform:translateY(20px);transition:opacity .8s cubic-bezier(.25,1,.5,1),transform .8s cubic-bezier(.25,1,.5,1),color .6s;transition-delay:.25s;}
        .ss-eyebrow::before{content:'';display:inline-block;width:28px;height:1px;background:currentColor;opacity:.5;}
        .ss-slide.ss-active .ss-eyebrow{opacity:1;transform:translateY(0);}
        .ss-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px;opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.25,1,.5,1),transform .8s cubic-bezier(.25,1,.5,1);transition-delay:.55s;}
        .ss-slide.ss-active .ss-chips{opacity:1;transform:translateY(0);}
        .ss-chip{display:inline-flex;align-items:baseline;gap:6px;padding:8px 14px;border:1px solid var(--ss-chip-border,rgba(124,58,237,.25));border-radius:999px;background:var(--ss-chip-bg,rgba(124,58,237,.07));backdrop-filter:blur(6px);font-size:11px;letter-spacing:.5px;color:var(--ss-chip-color,rgba(15,10,30,.7));white-space:nowrap;transition:background .6s,border-color .6s,color .6s;}
        .ss-cta-row{display:flex;align-items:center;gap:14px;margin-top:26px;opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.25,1,.5,1),transform .8s cubic-bezier(.25,1,.5,1);transition-delay:.65s;}
        .ss-slide.ss-active .ss-cta-row{opacity:1;transform:translateY(0);}
        .ss-cta-primary{display:inline-flex;align-items:center;gap:8px;padding:12px 10px 12px 22px;background:linear-gradient(135deg,#7C3AED,#6D28D9);color:#fff;text-decoration:none;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-radius:999px;pointer-events:auto;box-shadow:0 0 24px rgba(124,58,237,.5);transition:transform .3s,box-shadow .3s;}
        .ss-cta-primary:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 0 40px rgba(124,58,237,.75);}
        .ss-cta-primary:hover .ss-btn-inner{transform:translateY(-50%);}
        .ss-cta-primary:hover .ss-arrow{transform:rotate(-45deg);}
        .ss-cta-ghost{display:inline-flex;align-items:center;gap:8px;padding:12px 10px 12px 20px;border:1px solid var(--ss-ghost-border,rgba(124,58,237,.3));color:var(--ss-ghost-color,#7C3AED);text-decoration:none;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;border-radius:999px;background:var(--ss-ghost-bg,rgba(124,58,237,.06));backdrop-filter:blur(6px);transition:border-color .3s,background .3s,color .3s;pointer-events:auto;}
        .ss-cta-ghost:hover{border-color:rgba(124,58,237,.6);background:rgba(124,58,237,.12);}
        .ss-cta-ghost:hover .ss-btn-inner{transform:translateY(-50%);}
        .ss-cta-ghost:hover .ss-arrow{transform:rotate(-45deg);}
        .ss-ai-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border:1px solid var(--ss-badge-border,rgba(124,58,237,.3));border-radius:999px;background:var(--ss-badge-bg,rgba(124,58,237,.07));font-size:10px;font-weight:600;color:var(--ss-badge-color,#7C3AED);text-transform:uppercase;letter-spacing:2px;margin-bottom:18px;margin-left:60px;opacity:0;transform:translateY(20px);transition:opacity .8s cubic-bezier(.25,1,.5,1),transform .8s cubic-bezier(.25,1,.5,1),background .6s,border-color .6s,color .6s;transition-delay:.1s;}
        .ss-ai-dot{width:6px;height:6px;border-radius:50%;background:var(--ss-badge-color,#7C3AED);animation:ss-pulse 2s infinite;}
        @keyframes ss-pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(124,58,237,.4);}50%{opacity:.6;box-shadow:0 0 0 4px rgba(124,58,237,0);}}
        .ss-slide.ss-active .ss-ai-badge{opacity:1;transform:translateY(0);}
        .ss-grid-h{position:fixed;top:70px;left:0;right:0;height:1px;background:rgba(124,58,237,.12);z-index:5;pointer-events:none;}
        .ss-grid-v{position:fixed;top:0;left:40px;right:40px;width:calc(100% - 80px);height:100vh;display:flex;justify-content:space-between;z-index:5;pointer-events:none;}
        .ss-grid-line{position:relative;width:1px;height:100%;background:var(--ss-grid-line,rgba(124,58,237,.08));transition:background .6s;}
        .ss-grid-line:nth-child(3){margin-top:70px;height:calc(100vh - 70px);}
        .ss-grid-dot{position:absolute;left:50%;transform:translate(-50%,-50%);width:5px;height:5px;border-radius:50%;background:var(--ss-grid-dot,rgba(124,58,237,.35));box-shadow:0 0 6px rgba(124,58,237,.2);transition:background .6s;}
        .ss-story-dashes{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;gap:12px;}
        .ss-story-dash{width:2px;height:40px;background:rgba(124,58,237,.15);border-radius:2px;}
        .ss-dash-fill{width:100%;height:0%;background:#7C3AED;border-radius:2px;}
        :root{--ss-text-primary:#0F0A1E;--ss-text-desc:rgba(15,10,30,.55);--ss-text-eyebrow:rgba(124,58,237,.7);--ss-text-brand:#0F0A1E;--ss-text-nav:rgba(15,10,30,.5);--ss-nav-hover:#7C3AED;--ss-badge-bg:rgba(124,58,237,.07);--ss-badge-border:rgba(124,58,237,.3);--ss-badge-color:#7C3AED;--ss-chip-bg:rgba(124,58,237,.07);--ss-chip-border:rgba(124,58,237,.25);--ss-chip-color:rgba(15,10,30,.7);--ss-ghost-color:#7C3AED;--ss-ghost-border:rgba(124,58,237,.3);--ss-ghost-bg:rgba(124,58,237,.06);--ss-grid-line:rgba(124,58,237,.08);--ss-grid-dot:rgba(124,58,237,.35);}
        body[data-section="2"]{--ss-text-primary:#F5F3FF;--ss-text-desc:rgba(245,243,255,.7);--ss-text-eyebrow:rgba(196,181,253,.85);--ss-text-brand:#F5F3FF;--ss-text-nav:rgba(255,255,255,.6);--ss-nav-hover:#C4B5FD;--ss-badge-bg:rgba(167,139,250,.15);--ss-badge-border:rgba(167,139,250,.4);--ss-badge-color:#C4B5FD;--ss-chip-bg:rgba(167,139,250,.12);--ss-chip-border:rgba(167,139,250,.35);--ss-chip-color:#DDD6FE;--ss-ghost-color:#C4B5FD;--ss-ghost-border:rgba(167,139,250,.4);--ss-ghost-bg:rgba(124,58,237,.15);--ss-grid-line:rgba(167,139,250,.12);--ss-grid-dot:rgba(167,139,250,.5);}
        body[data-section="3"]{--ss-text-primary:#ECFDF5;--ss-text-desc:rgba(236,253,245,.75);--ss-text-eyebrow:rgba(110,231,183,.9);--ss-text-brand:#ECFDF5;--ss-text-nav:rgba(255,255,255,.6);--ss-nav-hover:#6EE7B7;--ss-badge-bg:rgba(16,185,129,.15);--ss-badge-border:rgba(16,185,129,.4);--ss-badge-color:#6EE7B7;--ss-chip-bg:rgba(16,185,129,.12);--ss-chip-border:rgba(16,185,129,.35);--ss-chip-color:#D1FAE5;--ss-ghost-color:#6EE7B7;--ss-ghost-border:rgba(16,185,129,.4);--ss-ghost-bg:rgba(16,185,129,.12);--ss-grid-line:rgba(16,185,129,.1);--ss-grid-dot:rgba(16,185,129,.5);}
        body[data-section="4"]{--ss-text-primary:#FAF5FF;--ss-text-desc:rgba(250,245,255,.72);--ss-text-eyebrow:rgba(216,180,254,.9);--ss-text-brand:#FAF5FF;--ss-text-nav:rgba(255,255,255,.6);--ss-nav-hover:#E9D5FF;--ss-badge-bg:rgba(192,132,252,.15);--ss-badge-border:rgba(192,132,252,.4);--ss-badge-color:#E9D5FF;--ss-chip-bg:rgba(192,132,252,.12);--ss-chip-border:rgba(192,132,252,.35);--ss-chip-color:#F3E8FF;--ss-ghost-color:#E9D5FF;--ss-ghost-border:rgba(216,180,254,.4);--ss-ghost-bg:rgba(139,92,246,.18);--ss-grid-line:rgba(192,132,252,.12);--ss-grid-dot:rgba(192,132,252,.5);}
        @media(max-width:900px){.ss-root{min-height:500vh;}.ss-cinematic{padding:0 28px 32px 28px;}.ss-nav{gap:16px;}.ss-nav-link{font-size:11px;}.ss-btn{padding:8px 8px 8px 16px;font-size:12px;}.ss-slide-title{font-size:clamp(48px,7.5vw,72px);}#ss-slide-1 .ss-slide-title{margin-left:28px;}#ss-slide-1 .ss-desc-row{flex-direction:column;gap:16px;}#ss-slide-1 .ss-col-1{margin-left:28px;width:60vw;max-width:480px;}#ss-slide-1 .ss-col-2{position:static;margin-left:28px;width:60vw;max-width:480px;}.ss-ai-badge{margin-left:28px;}#ss-slide-2 .ss-slide-title{margin-left:28px;}#ss-slide-2 .ss-slide-desc{margin-left:28px;width:70vw;max-width:520px;}#ss-slide-2-img{left:auto;right:28px;top:100px;width:200px;}#ss-slide-3{left:28px;width:calc(100% - 56px);max-width:none;}#ss-slide-3 .ss-slide-title{white-space:normal;}#ss-slide-4{left:28px;max-width:calc(100% - 56px);}.ss-grid-v{left:20px;right:20px;width:calc(100% - 40px);}}
        @media(max-width:600px){.ss-root{min-height:400vh;cursor:auto;}.ss-root *{cursor:auto!important;}.ss-cursor-inner,.ss-cursor-outer{display:none;}.ss-cinematic{padding:0 20px 28px 20px;}.ss-header{padding:16px 0;}.ss-nav{display:none;}.ss-brand{font-size:14px;}.ss-btn{padding:7px 7px 7px 14px;font-size:11px;gap:6px;}.ss-btn-icon{width:22px;height:22px;}.ss-slide{position:absolute;bottom:8%;left:0!important;width:100%!important;max-width:none!important;padding:0 20px;}.ss-slide-title{font-size:clamp(26px,8.5vw,52px);line-height:1.05;margin-bottom:14px;white-space:normal!important;}#ss-slide-1 .ss-slide-title{margin-left:0;}.ss-ai-badge{margin-left:0;}#ss-slide-1 .ss-desc-row{flex-direction:column;gap:12px;}#ss-slide-1 .ss-col-1,#ss-slide-1 .ss-col-2{margin-left:0;width:100%;max-width:100%;position:static;}#ss-slide-2 .ss-slide-title{margin-left:0;}#ss-slide-2 .ss-slide-desc{margin-left:0;width:100%;max-width:100%;}#ss-slide-2-img{position:absolute;top:-180px;left:20px!important;width:calc(100% - 40px)!important;aspect-ratio:16/9;border-radius:12px;}.ss-cta-row{flex-direction:column;align-items:flex-start;}.ss-cta-primary,.ss-cta-ghost{font-size:11px;}.ss-slide-desc{font-size:14px;}.ss-grid-v,.ss-grid-h{display:none;}}
        @media(max-width:380px){.ss-slide-title{font-size:clamp(22px,8vw,38px);}.ss-cinematic{padding:0 16px 24px 16px;}.ss-slide{padding:0 16px;}}
        @media(hover:none){.ss-root *{cursor:auto!important;}.ss-cursor-inner,.ss-cursor-outer{display:none;}}
      `}</style>

      <div className="ss-root">
        <div className="ss-cursor-inner"></div>
        <div className="ss-cursor-outer"></div>

        <div className="ss-cinematic">
          <header className="ss-header">
            <a href="/" className="ss-brand">
              <svg className="ss-brand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              SkillSprint AI
            </a>
            <nav className="ss-nav">
              <a href="#ss-slide-1" className="ss-nav-link">Features</a>
              <span className="ss-nav-dot"></span>
              <a href="#ss-slide-2" className="ss-nav-link">Learning</a>
              <span className="ss-nav-dot"></span>
              <a href="#ss-slide-3" className="ss-nav-link">Paths</a>
              <span className="ss-nav-dot"></span>
              <a href="#ss-slide-4" className="ss-nav-link">Start</a>
            </nav>
            <div className="ss-header-actions">
              <a href="/auth/signin" className="ss-btn ss-btn-dark">
                <span className="ss-btn-text"><span className="ss-btn-inner"><span>Sign In</span><span>Sign In</span></span></span>
                <span className="ss-btn-icon ss-icon-dark">
                  <svg className="ss-arrow" viewBox="0 0 24 24" fill="none" stroke="#0F0A1E" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
              </a>
              <a href="/auth/signup" className="ss-btn ss-btn-primary">
                <span className="ss-btn-text"><span className="ss-btn-inner"><span>Get Started Free</span><span>Get Started Free</span></span></span>
                <span className="ss-btn-icon ss-icon-light">
                  <svg className="ss-arrow" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
              </a>
            </div>
          </header>

          <div className="ss-slide" id="ss-slide-1">
            <div className="ss-ai-badge"><span className="ss-ai-dot"></span>Powered by Adaptive AI</div>
            <h1 className="ss-slide-title">Master<br/>Any Skill</h1>
            <div className="ss-desc-row">
              <p className="ss-slide-desc ss-col-1">SkillSprint AI builds hyper-personalized learning paths that adapt to your pace, style, and goals — keeping you in flow state for maximum retention.</p>
              <p className="ss-slide-desc ss-col-2">Join 50,000+ learners mastering real skills 10x faster with AI-generated micro-lessons, live skill verification, and community sprints.</p>
            </div>
          </div>

          <div className="ss-slide" id="ss-slide-2">
            <span className="ss-eyebrow" style={{marginLeft:"calc(25vw + 40px)"}}>Adaptive AI · Personalized Paths</span>
            <h2 className="ss-slide-title">Flow State<br/>Learning</h2>
            <p className="ss-slide-desc">AI continuously maps your skill gaps and adjusts difficulty in real time — never too easy, never too hard, always in the optimal challenge zone.</p>
          </div>

          <div className="ss-slide" id="ss-slide-3">
            <span className="ss-eyebrow">Skill Catalog · 200+ Learning Paths</span>
            <h2 className="ss-slide-title">Sprint Through Skills</h2>
            <p className="ss-slide-desc">From AI &amp; ML to product design and leadership — curated paths built by experts, accelerated by AI for maximum skill density.</p>
            <div className="ss-chips">
              <span className="ss-chip">AI &amp; Machine Learning</span>
              <span className="ss-chip">Frontend Development</span>
              <span className="ss-chip">Data Science</span>
              <span className="ss-chip">UX Design</span>
              <span className="ss-chip">Product Strategy</span>
              <span className="ss-chip">Cloud &amp; DevOps</span>
            </div>
          </div>

          <div className="ss-slide" id="ss-slide-4">
            <span className="ss-eyebrow">Get Started · Free Forever Plan</span>
            <h2 className="ss-slide-title">Start Your<br/>Sprint Today</h2>
            <p className="ss-slide-desc">Your first 3 skill paths are completely free. No credit card, no friction — just AI-powered learning from day one.</p>
            <div className="ss-cta-row">
              <a href="/auth/signup" className="ss-cta-primary">
                <span className="ss-btn-text"><span className="ss-btn-inner"><span>Get Started Free</span><span>Get Started Free</span></span></span>
                <span className="ss-btn-icon ss-icon-light" style={{width:24,height:24}}>
                  <svg className="ss-arrow" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
              </a>
              <a href="/auth/signin" className="ss-cta-ghost">
                <span className="ss-btn-text"><span className="ss-btn-inner"><span>Sign In</span><span>Sign In</span></span></span>
                <span className="ss-btn-icon" style={{width:24,height:24,background:"transparent"}}>
                  <svg className="ss-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
              </a>
            </div>
          </div>
        </div>

        <div id="ss-slide-2-img">
          <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80" alt="AI Learning" />
        </div>

        <div className="ss-grid-h"></div>
        <div className="ss-grid-v">
          {[0,1,2,3].map(i=>(
            <div key={i} className="ss-grid-line">
              <div className="ss-grid-dot" style={{top:"70px"}}></div>
              <div className="ss-grid-dot" style={{top:"100%"}}></div>
            </div>
          ))}
          <div className="ss-grid-line">
            <div className="ss-grid-dot" style={{top:"70px"}}></div>
            <div className="ss-grid-dot" style={{top:"100%"}}></div>
            <div className="ss-story-dashes">
              {[1,2,3,4].map(n=>(
                <div key={n} className="ss-story-dash">
                  <div className="ss-dash-fill" id={`ss-dash-fill-${n}`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <WebGLScene
          onSlidesUpdate={handleSlidesUpdate}
          onSectionUpdate={handleSectionUpdate}
          onDotsUpdate={handleDotsUpdate}
        />
      </div>
    </>
  );
}
