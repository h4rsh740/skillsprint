"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrainCircuit, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import "../auth.css";

function SignUpContent() {
  const { user, loading, error: authError, loginWithGoogle, loginWithGitHub, registerWithEmail } = useAuth();
  const [opLoading, setOpLoading] = useState<"google" | "github" | "email" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [authStatus, setAuthStatus] = useState<"idle" | "success" | "error">("idle");
  const searchParams = useSearchParams();
  const router = useRouter();

  const eyes1Ref = useRef<HTMLDivElement>(null);
  const eyes2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX * 100) / window.innerWidth + "%";
      const y = (event.clientY * 100) / window.innerHeight + "%";

      if (eyes1Ref.current && eyes2Ref.current) {
        eyes1Ref.current.style.left = x;
        eyes1Ref.current.style.top = y;
        eyes1Ref.current.style.transform = `translate(-${x}, -${y})`;

        eyes2Ref.current.style.left = x;
        eyes2Ref.current.style.top = y;
        eyes2Ref.current.style.transform = `translate(-${x}, -${y})`;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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

  const redirectAfterLogin = () => {
    setTimeout(() => {
      router.push("/onboarding");
    }, 500);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    setOpLoading("email");
    setAuthStatus("idle");
    try {
      await registerWithEmail(email, password, name);
      setAuthStatus("success");
      setToast({ message: "Account created successfully!", type: "success" });
      redirectAfterLogin();
    } catch (err: any) {
      setAuthStatus("error");
      setToast({ message: err.message || "Failed to register with email", type: "error" });
      setTimeout(() => setAuthStatus("idle"), 2000);
    } finally {
      setOpLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setOpLoading("google");
    setAuthStatus("idle");
    try {
      await loginWithGoogle();
      setAuthStatus("success");
      setToast({ message: "Account created! Google registration successful.", type: "success" });
      redirectAfterLogin();
    } catch (err: any) {
      setAuthStatus("error");
      setToast({ message: err.message || "Failed to register with Google", type: "error" });
      setTimeout(() => setAuthStatus("idle"), 2000);
    } finally {
      setOpLoading(null);
    }
  };

  const handleGitHubLogin = async () => {
    setOpLoading("github");
    setAuthStatus("idle");
    try {
      await loginWithGitHub();
      setAuthStatus("success");
      setToast({ message: "Account created! GitHub registration successful.", type: "success" });
      redirectAfterLogin();
    } catch (err: any) {
      setAuthStatus("error");
      setToast({ message: err.message || "Failed to register with GitHub", type: "error" });
      setTimeout(() => setAuthStatus("idle"), 2000);
    } finally {
      setOpLoading(null);
    }
  };



  return (
    <div className="auth-wrapper">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] max-w-sm flex items-start gap-3 p-4 rounded-2xl backdrop-blur-md shadow-2xl border transition-all duration-300 animate-in slide-in-from-top-5 ${
          toast.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
        }`}>
          {toast.type === "error" ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <div className="flex-1 text-[13.5px] font-semibold leading-relaxed font-sans">{toast.message}</div>
          <button onClick={() => setToast(null)} className="hover:opacity-70 text-xs font-bold pl-2">✕</button>
        </div>
      )}

      <div className="auth-container">
        <main className="auth-main">
          <section className="auth-section">
            <div className={`face ${authStatus === "success" ? "face-success" : authStatus === "error" ? "face-error" : ""}`}>
              <img src="https://assets.codepen.io/9277864/PF.png" alt="Face" width="250" height="250" />
              <div className="eye-cover1">
                <div ref={eyes1Ref} className="eyes1"></div>
              </div>
              <div className="eye-cover2">
                <div ref={eyes2Ref} className="eyes2"></div>
              </div>
            </div>
            
            <div className="login-container">
              <div className="social-login">
                <Link href="/" className="auth-logo cursor-pointer hover:opacity-90 transition-opacity">
                  <BrainCircuit className="text-[#ffc85c]" />
                  <p>SkillSprint AI</p>
                </Link>
                <p>Register using social media to get quick access</p>
                <div className="social-grp">
                  <div className="social-btn">
                    <button onClick={handleGitHubLogin} disabled={loading || opLoading !== null} type="button">
                      {opLoading === "github" ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" /> : (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                          </svg>
                          <span>GitHub</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="social-btn">
                    <button onClick={handleGoogleLogin} disabled={loading || opLoading !== null} type="button">
                      {opLoading === "google" ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" /> : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span>Google</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="email-login">
                <div className="mobile-auth-logo">
                  <Link href="/" className="flex items-center gap-2 justify-center py-2 hover:opacity-85 transition-opacity">
                    <BrainCircuit className="text-[#ee7344] w-6 h-6" />
                    <span className="font-bold text-[18px] text-black" style={{ fontFamily: "Unbounded, sans-serif" }}>SkillSprint AI</span>
                  </Link>
                </div>
                <div className="login-h-container">
                  <h1>Create an account</h1>
                  <p>Already have an account? <Link href="/auth/signin">Sign in!</Link></p>
                </div>
                
                {(authError || searchParams.get("error")) && !toast && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-[13px] mb-6 flex items-start gap-2.5 font-sans">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{authError || decodeURIComponent(searchParams.get("error") || "")}</span>
                  </div>
                )}

                <form onSubmit={handleEmailSignup} className="auth-form">
                  <label className="auth-label" htmlFor="name">
                    <input 
                      id="name" 
                      name="name" 
                      type="text" 
                      autoComplete="off"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                    <span className={name ? "focus-span" : ""}>Full Name</span>
                  </label>
                  <label className="auth-label" htmlFor="email">
                    <input 
                      id="email" 
                      name="email" 
                      type="email" 
                      autoComplete="off"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                    <span className={email ? "focus-span" : ""}>Email</span>
                  </label>
                  <label className="auth-label" htmlFor="password">
                    <input 
                      id="password" 
                      name="password" 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <span className={password ? "focus-span" : ""}>Password</span>
                  </label>
                  <button type="submit" disabled={loading || opLoading !== null || !email || !password || !name}>
                    {opLoading === "email" ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Sign Up with Email"}
                  </button>
                </form>
              </div>
            </div>
          </section>
          <div className="vector-1"></div>
          <div className="vector-2"></div>
          <div className="vector-3"></div>
        </main>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ee7344]" />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}
