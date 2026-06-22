"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrainCircuit, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Shader, ChromaFlow, FilmGrain, FlutedGlass, Swirl } from "shaders/react";

function SignUpContent() {
  const { user, loading, error: authError, loginWithGoogle, loginWithGitHub, loginWithLinkedIn } = useAuth();
  const [opLoading, setOpLoading] = useState<"google" | "github" | "linkedin" | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setToast({ message: decodeURIComponent(errorParam), type: "error" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!loading && user) {
      if (user.onboardingCompleted) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    }
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    setOpLoading("google");
    try {
      await loginWithGoogle();
      setToast({ message: "Account created! Google registration successful.", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to register with Google", type: "error" });
    } finally {
      setOpLoading(null);
    }
  };

  const handleGitHubLogin = async () => {
    setOpLoading("github");
    try {
      await loginWithGitHub();
      setToast({ message: "Account created! GitHub registration successful.", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to register with GitHub", type: "error" });
    } finally {
      setOpLoading(null);
    }
  };

  const handleLinkedInLogin = () => {
    setOpLoading("linkedin");
    loginWithLinkedIn();
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#090D16] font-sans text-white selection:bg-[#4f46e5] selection:text-white p-4 overflow-hidden">
      {/* Background Shader */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <Shader>
          <Swirl colorA="#05070c" colorB="#0a0f1d" detail={1.7} />
          <ChromaFlow baseColor="#05070c" downColor="#4f46e5" leftColor="#06b6d4" rightColor="#8b5cf6" upColor="#6366f1" momentum={12} radius={3.0} />
          <FlutedGlass aberration={0.61} angle={31} frequency={8} highlight={0.12} highlightSoftness={0} lightAngle={-90} refraction={4} shape="rounded" softness={1} speed={0.15} />
          <FilmGrain strength={0.05} />
        </Shader>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] max-w-sm flex items-start gap-3 p-4 rounded-2xl backdrop-blur-md shadow-2xl border transition-all duration-300 animate-in slide-in-from-top-5 ${
          toast.type === "error" 
            ? "bg-red-500/10 border-red-500/20 text-red-300" 
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
        }`}>
          {toast.type === "error" ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          )}
          <div className="flex-1 text-[13.5px] font-semibold leading-relaxed">
            {toast.message}
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white text-xs font-bold pl-2">
            ✕
          </button>
        </div>
      )}

      {/* Header and Card */}
      <div className="relative z-10 w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#4f46e5] to-[#06b6d4] rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-[#4f46e5]/10 animate-pulse">
            <BrainCircuit className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-white">SkillSprint AI</h1>
          <p className="text-[14px] text-gray-400 mt-1">Predict. Prepare. Place. Let&apos;s build your digital twin.</p>
        </div>

        <div className="liquid-glass bg-[#0e1726]/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl shadow-black/40">
          <h2 className="text-xl font-bold text-slate-100 text-center mb-1">Create Account</h2>
          <p className="text-[13px] text-gray-400 text-center mb-8">Select an account provider to register</p>

          {(authError || searchParams.get("error")) && !toast && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-2xl text-[13px] mb-6 flex items-start gap-2.5 font-medium leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span>{authError || decodeURIComponent(searchParams.get("error") || "")}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Google Signup */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading || opLoading !== null}
              className="w-full flex items-center gap-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-[14px] font-semibold rounded-2xl py-3.5 px-5 transition-all duration-300 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {opLoading === "google" ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Register with Google</span>
                </>
              )}
            </button>

            {/* GitHub Signup */}
            <button
              onClick={handleGitHubLogin}
              disabled={loading || opLoading !== null}
              className="w-full flex items-center gap-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-[14px] font-semibold rounded-2xl py-3.5 px-5 transition-all duration-300 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {opLoading === "github" ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                  </svg>
                  <span>Register with GitHub</span>
                </>
              )}
            </button>

            {/* LinkedIn Signup */}
            <button
              onClick={handleLinkedInLogin}
              disabled={loading || opLoading !== null}
              className="w-full flex items-center gap-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-[14px] font-semibold rounded-2xl py-3.5 px-5 transition-all duration-300 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {opLoading === "linkedin" ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                  <span>Register with LinkedIn</span>
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[13px] text-gray-400 mt-8">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-[#4f46e5] font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090D16] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}
