"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  BrainCircuit, 
  Loader2, 
  Upload, 
  Check, 
  ArrowRight, 
  Sparkles, 
  AlertCircle,
  FileText
} from "lucide-react";
import "../auth/auth.css";

// Inline custom SVG replacements for missing Lucide icons in package.json version
function Github(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function Linkedin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const careerSkillsMap: Record<string, string[]> = {
  "Frontend Developer": ["React", "TypeScript", "CSS", "HTML", "Next.js", "Tailwind CSS", "JavaScript", "Redux"],
  "Backend Developer": ["Node.js", "Python", "Go", "Java", "PostgreSQL", "MongoDB", "Docker", "REST APIs", "Redis"],
  "Full Stack Developer": ["React", "Node.js", "TypeScript", "Next.js", "PostgreSQL", "MongoDB", "Docker", "AWS", "GraphQL"],
  "Data Analyst": ["SQL", "Python", "Tableau", "Power BI", "Excel", "Pandas", "Statistics", "R"],
  "AI Engineer": ["Python", "PyTorch", "TensorFlow", "OpenAI API", "Hugging Face", "LLMs", "Machine Learning", "LangChain"],
  "Product Manager": ["Product Roadmap", "Agile/Scrum", "SQL", "A/B Testing", "Market Research", "User Analytics"]
};

export default function OnboardingPage() {
  const { user, loading, updateOnboarding, refreshSession } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Face tracker & reaction states
  const [authStatus, setAuthStatus] = useState<"idle" | "success" | "error">("idle");
  const eyes1Ref = useRef<HTMLDivElement>(null);
  const eyes2Ref = useRef<HTMLDivElement>(null);

  // Form states (Step 1)
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [graduationYear, setGraduationYear] = useState("2026");
  const [cgpa, setCgpa] = useState("");
  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [skills, setSkills] = useState("");

  // Resume state (Step 4)
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Twin generation progress (Step 5)
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);

  // Tracker movement effect
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

  // Fetch existing profile and set initial step on load
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfileLoaded(false);
      return;
    }
    if (profileLoaded) return;
    
    fetch("/api/onboard")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.profile) {
          const p = data.profile;
          setFullName(p.fullName || user.name || "");
          setCollege(p.college || "");
          setBranch(p.branch || "");
          setGraduationYear(String(p.graduationYear || "2026"));
          setCgpa(String(p.cgpa || ""));
          setTargetRole(p.targetRole || "Frontend Developer");
          setSkills(Array.isArray(p.skills) ? p.skills.join(", ") : (p.skills || ""));
          
          if (user.githubConnected && user.resumeUploaded) {
            setStep(4);
            setTimeout(() => startTwinGeneration(), 100);
          } else if (user.githubConnected) {
            setStep(3);
          } else {
            setStep(2);
          }
        } else {
          setFullName(user.name || "");
          setStep(1);
        }
        setProfileLoaded(true);
      })
      .catch(err => {
        console.error("Error fetching profile status:", err);
        setFullName(user.name || "");
        setStep(1);
        setProfileLoaded(true);
      });
  }, [user, profileLoaded]);

  // If onboarding completed, redirect to dashboard
  useEffect(() => {
    if (!loading && user?.onboardingCompleted) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!fullName || !college || !branch || !graduationYear || !cgpa || !skills) {
        setError("Please fill out all profile fields to continue");
        setAuthStatus("error");
        setTimeout(() => setAuthStatus("idle"), 1500);
        return;
      }
      
      setAuthStatus("success");
      setSaving(true);
      
      // Save profile details to PostgreSQL / JSON DB
      const skillsArray = skills.split(",").map(s => s.trim()).filter(Boolean);
      
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("college", college);
      formData.append("branch", branch);
      formData.append("graduationYear", graduationYear);
      formData.append("cgpa", cgpa);
      formData.append("targetRole", targetRole);
      formData.append("skills", skillsArray.join(","));
      formData.append("githubUsername", user?.email.split("@")[0] || "candidate");

      // We call the server action onboardStudent or API
      fetch("/api/onboard", {
        method: "POST",
        body: formData
      })
      .then(res => res.json())
      .then(async (data) => {
        setSaving(false);
        if (data.success) {
          await refreshSession();
          setStep(2);
        } else {
          setError(data.error || "Failed to save profile details");
        }
      })
      .catch(err => {
        setSaving(false);
        setError("Connection error. Failed to save profile.");
        console.error(err);
      });
    } else if (step === 2) {
      // Connect GitHub completed or skipped
      setStep(3);
    } else if (step === 3) {
      // Resume upload completed or skipped
      setStep(4);
      startTwinGeneration();
    }
  };

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
      "text/plain" // txt
    ];

    if (allowedTypes.includes(file.type) || file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".txt")) {
      setUploadingResume(true);
      setError("");
      
      try {
        const formData = new FormData();
        formData.append("resume", file);
        
        const res = await fetch("/api/resume/upload", {
          method: "POST",
          body: formData
        });
        
        const data = await res.json();
        setUploadingResume(false);

        if (data.success) {
          setResumeFile(file);
          setAuthStatus("success");
          setTimeout(() => {
            setAuthStatus("idle");
            setStep(4);
            startTwinGeneration();
          }, 800);
        } else {
          setError(data.error || "Failed to analyze resume. Try another file.");
          setAuthStatus("error");
        }
      } catch (err) {
        setUploadingResume(false);
        setError("Resume scanner API failed. Please try again.");
        setAuthStatus("error");
      }
    } else {
      setError("Please upload a valid PDF, DOCX, or TXT file");
      setAuthStatus("error");
      setTimeout(() => setAuthStatus("idle"), 1500);
    }
  };

  const startTwinGeneration = () => {
    setGenerationProgress(0);
    setGenerationLogs([]);
    
    const logs = [
      "Analyzing resume metadata...",
      "Extracting key skill signals...",
      "Syncing connected GitHub repository data...",
      "Mapping professional details from LinkedIn...",
      "Generating Career Twin model mapping...",
      "Running predictive placement probability simulations...",
      "Synthesizing digital twin projection..."
    ];

    let currentLogIndex = 0;
    
    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        const next = prev + 10;
        
        if (next % 15 === 0 && currentLogIndex < logs.length) {
          setGenerationLogs((l) => [...l, logs[currentLogIndex]]);
          currentLogIndex++;
        }

        if (next >= 100) {
          clearInterval(interval);
          completeOnboarding();
          return 100;
        }
        return next;
      });
    }, 400);
  };

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      // 1. Trigger Career Twin build (non-blocking — don't fail onboarding if this errors)
      try {
        await fetch("/api/career-twin/build", { method: "POST" });
      } catch (twinErr) {
        console.warn("Career twin build failed (non-critical):", twinErr);
      }

      // 2. Mark onboarding complete in PostgreSQL (critical — this is what session refresh reads)
      const patchRes = await fetch("/api/onboard", { method: "PATCH" });
      const patchData = await patchRes.json();
      if (!patchData.success) {
        throw new Error(patchData.error || "Failed to mark onboarding complete");
      }

      // 3. Also update Firestore for real-time listeners
      try {
        await updateOnboarding({
          onboardingCompleted: true,
          careerTwinGenerated: true
        });
      } catch (fsErr) {
        console.warn("Firestore onboarding update failed (non-critical):", fsErr);
      }

      // 4. Refresh session so the new onboardingCompleted=true is reflected
      await refreshSession();

      setAuthStatus("success");

      // 5. Hard redirect — forces a fresh page load so ProtectedRoute reads the new session
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    } catch (err: any) {
      setError(err.message || "Failed to save onboarding details");
      setAuthStatus("error");
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    const skillsArray = skills.split(",").map(s => s.trim()).filter(Boolean);
    if (skillsArray.includes(skill)) {
      const filtered = skillsArray.filter(s => s !== skill);
      setSkills(filtered.join(", "));
    } else {
      skillsArray.push(skill);
      setSkills(skillsArray.join(", "));
    }
  };

  // Local loading guard — never block UI for more than 3 seconds
  const [localLoading, setLocalLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLocalLoading(false), 3000);
    if (!loading) { clearTimeout(t); setLocalLoading(false); }
    return () => clearTimeout(t);
  }, [loading]);

  if (localLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#ee7344]" />
        <span className="font-semibold text-sm tracking-wider">Syncing Career OS...</span>
      </div>
    );
  }

  const stepsList = [
    { id: 1, label: "Profile Details" },
    { id: 2, label: "Connect GitHub" },
    { id: 3, label: "Resume Upload" },
    { id: 4, label: "Synthesize Twin" }
  ];

  const availableSkills = careerSkillsMap[targetRole] || [];

  return (
    <div className="auth-wrapper" style={{ padding: "15px 10px", minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <style>{`
        .auth-form {
          gap: 16px !important;
        }
        .auth-form input[type="text"],
        .auth-form select {
          height: 42px !important;
          font-size: 14px !important;
          padding: 0 12px !important;
          border-radius: 12px !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          background: rgba(255, 255, 255, 0.6) !important;
          width: 100%;
        }
        .auth-label span {
          font-size: 14px !important;
          top: 10px !important;
        }
        .auth-label:focus-within span,
        .auth-label .focus-span {
          transform: translate(0.27rem, -95%) scale(0.8) !important;
        }
        .glass-box {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.08);
        }
      `}</style>

      <div className="auth-container" style={{ maxWidth: "1240px", margin: "auto" }}>
        <main className="auth-main" style={{ padding: "10px" }}>
          <section className="auth-section" style={{ gap: "40px", maxWidth: "100%", marginTop: "10px", marginBottom: "10px" }}>
            
            {/* Interactive Face Tracking */}
            <div className={`face ${authStatus === "success" ? "face-success" : authStatus === "error" ? "face-error" : ""}`}>
              <img src="https://assets.codepen.io/9277864/PF.png" alt="Face" width="250" height="250" />
              <div className="eye-cover1">
                <div ref={eyes1Ref} className="eyes1"></div>
              </div>
              <div className="eye-cover2">
                <div ref={eyes2Ref} className="eyes2"></div>
              </div>
            </div>

            {/* Main Form Box */}
            <div className="login-container glass-box rounded-3xl" style={{ width: "100%", maxWidth: "980px", marginTop: "10px" }}>
              
              {/* Left Panel: Step progress checklist */}
              <div className="social-login" style={{ flex: "1.1", padding: "30px 25px", gap: "28px", borderTopLeftRadius: "24px", borderBottomLeftRadius: "24px" }}>
                <Link href="/" className="auth-logo cursor-pointer hover:opacity-90 transition-opacity">
                  <BrainCircuit className="text-[#ffc85c]" />
                  <p style={{ fontSize: "20px" }}>SkillSprint AI</p>
                </Link>
                
                <div>
                  <h2 className="text-lg font-bold text-white mb-1.5" style={{ fontFamily: "Unbounded, sans-serif" }}>Redesigning Career</h2>
                  <p className="text-[12.5px] text-white/80 leading-relaxed">Initialize your AI career operating system twin in 4 steps.</p>
                </div>

                <div className="flex flex-col gap-4.5 py-3 border-t border-white/10 mt-1">
                  {stepsList.map((s) => {
                    const isActive = s.id === step;
                    const isCompleted = s.id < step;
                    return (
                      <div 
                        key={s.id} 
                        className={`flex items-center gap-3 transition-all duration-300 ${
                          isActive 
                            ? "opacity-100 translate-x-1" 
                            : isCompleted 
                              ? "opacity-90" 
                              : "opacity-40"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                          isCompleted 
                            ? "bg-emerald-500 border-emerald-400 text-white" 
                            : isActive 
                              ? "bg-[#ffc85c] border-[#ffc85c] text-black" 
                              : "border-white/30 text-white/50"
                        }`}>
                          {isCompleted ? "✓" : s.id}
                        </div>
                        <span className={`text-[13px] font-sans ${isActive ? "font-bold text-[#ffc85c]" : "text-white"}`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel: Content Form */}
              <div className="email-login" style={{ flex: "2", padding: "28px 40px" }}>
                
                {/* Mobile-Only Progress Bar */}
                <div className="sm:hidden w-full flex gap-1 mb-4">
                  {[1, 2, 3, 4].map((s) => (
                    <div 
                      key={s} 
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                        s === step 
                          ? "bg-[#ea5455]" 
                          : s < step 
                            ? "bg-emerald-500" 
                            : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>

                <div className="login-h-container" style={{ marginBottom: "20px" }}>
                  <h1 className="text-[23px] font-bold text-black mb-1" style={{ letterSpacing: "-0.5px" }}>
                    {step === 1 && "Profile Details"}
                    {step === 2 && "Connect GitHub"}
                    {step === 3 && "Resume Analyzer"}
                    {step === 4 && "Synthesize Digital Twin"}
                  </h1>
                  <p className="text-[13px] text-gray-500 leading-relaxed">
                    {step === 1 && "Basic profile settings and career direction."}
                    {step === 2 && "Synchronize repository footprint to analyze commits, streak, and technologies."}
                    {step === 3 && "Scan PDF, DOCX, or TXT resume for ATS scoring and improvement recommendations."}
                    {step === 4 && "Aggregating code streaks and resume scores to spawn your Digital Career Twin."}
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl text-[13px] mb-5 flex items-start gap-2 font-sans font-semibold animate-in fade-in duration-300">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* STEP 1: Basic Profile Setup */}
                {step === 1 && (
                  <form 
                    className="auth-form animate-in fade-in slide-in-from-right-4 duration-500" 
                    onSubmit={(e) => { 
                      e.preventDefault(); 
                      handleNextStep(); 
                    }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="auth-label relative" htmlFor="fullName">
                        <input
                          id="fullName"
                          type="text"
                          autoComplete="off"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                        <span className={fullName ? "focus-span" : ""}>Full Name</span>
                      </label>

                      <label className="auth-label relative" htmlFor="college">
                        <input
                          id="college"
                          type="text"
                          autoComplete="off"
                          value={college}
                          onChange={(e) => setCollege(e.target.value)}
                          required
                        />
                        <span className={college ? "focus-span" : ""}>College / University</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <select
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="w-full bg-white border border-[#ccc] rounded-[4px] px-3 text-[15px] text-black focus:outline-none focus:ring-1 focus:ring-[#ffc85c] focus:border-[#ffc85c] transition-all"
                          style={{ height: "42px", appearance: "none" }}
                          required
                        >
                          <option value="">Select Branch</option>
                          <option>Computer Science</option>
                          <option>Information Technology</option>
                          <option>Electronics Engineering</option>
                          <option>Electrical Engineering</option>
                          <option>Mechanical Engineering</option>
                          <option>Mathematics & Computing</option>
                          <option>Other</option>
                        </select>
                        <span className="absolute left-2.5 -top-2 px-1 bg-white text-[11px] text-gray-500 font-semibold">Branch</span>
                      </div>

                      <div className="relative">
                        <select
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value)}
                          className="w-full bg-white border border-[#ccc] rounded-[4px] px-3 text-[15px] text-black focus:outline-none focus:ring-1 focus:ring-[#ffc85c] focus:border-[#ffc85c] transition-all"
                          style={{ height: "42px", appearance: "none" }}
                          required
                        >
                          <option>2024</option>
                          <option>2025</option>
                          <option>2026</option>
                          <option>2027</option>
                          <option>2028</option>
                        </select>
                        <span className="absolute left-2.5 -top-2 px-1 bg-white text-[11px] text-gray-500 font-semibold">Graduation Year</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="auth-label relative" htmlFor="cgpa">
                        <input
                          id="cgpa"
                          type="text"
                          autoComplete="off"
                          value={cgpa}
                          onChange={(e) => setCgpa(e.target.value)}
                          required
                        />
                        <span className={cgpa ? "focus-span" : ""}>Current CGPA (e.g. 8.5)</span>
                      </label>

                      <div className="relative">
                        <select
                          value={targetRole}
                          onChange={(e) => {
                            setTargetRole(e.target.value);
                            setSkills("");
                          }}
                          className="w-full bg-white border border-[#ccc] rounded-[4px] px-3 text-[15px] text-black focus:outline-none focus:ring-1 focus:ring-[#ffc85c] focus:border-[#ffc85c] transition-all"
                          style={{ height: "42px", appearance: "none" }}
                          required
                        >
                          <option>Frontend Developer</option>
                          <option>Backend Developer</option>
                          <option>Full Stack Developer</option>
                          <option>Data Analyst</option>
                          <option>AI Engineer</option>
                          <option>Product Manager</option>
                        </select>
                        <span className="absolute left-2.5 -top-2 px-1 bg-white text-[11px] text-gray-500 font-semibold">Target Career Goal</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="auth-label relative" htmlFor="skills">
                        <input
                          id="skills"
                          type="text"
                          autoComplete="off"
                          value={skills}
                          onChange={(e) => setSkills(e.target.value)}
                          required
                        />
                        <span className={skills ? "focus-span" : ""}>Skills (comma separated)</span>
                      </label>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {availableSkills.map((skill) => {
                          const isSelected = skills.split(",").map(s => s.trim()).includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => toggleSkill(skill)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#4f46e5] border-[#4f46e5] text-white shadow-sm"
                                  : "bg-white/60 border-gray-200 text-gray-700 hover:bg-white"
                              }`}
                            >
                              {isSelected ? "✓ " : "+ "}
                              {skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={saving}
                      className="w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#4338ca] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Continue to Integrations
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* STEP 2: Connect GitHub */}
                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-white/60 border border-gray-200 rounded-2xl p-6 text-center space-y-4 flex flex-col items-center shadow-sm">
                      <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                        <Github className="w-6 h-6 text-white" />
                      </div>
                      
                      {user?.githubConnected ? (
                        <div className="space-y-2">
                          <div className="text-emerald-600 font-bold flex items-center justify-center gap-1.5 text-[15px]">
                            <Check className="w-5 h-5 text-emerald-500" />
                            GitHub Footprint Synced
                          </div>
                          <p className="text-xs text-gray-500">Repositories statistics are successfully connected.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <h3 className="font-bold text-gray-900">Synchronize repositories</h3>
                          <p className="text-xs text-gray-500 max-w-sm">We will analyze commit frequencies, stars, README qualities, and languages to calibrate SDE scores.</p>
                        </div>
                      )}

                      {!user?.githubConnected && (
                        <button
                          type="button"
                          onClick={() => router.push("/api/auth/github")}
                          className="flex items-center justify-center gap-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl transition-all w-full max-w-xs cursor-pointer shadow-md"
                        >
                          <Github className="w-5 h-5" />
                          Connect GitHub footprint
                        </button>
                      )}
                    </div>

                    {!user?.githubConnected && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-[11px] leading-relaxed flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>**Limited Analysis Mode Active:** If you proceed without connecting GitHub, SkillSprint cannot audit repository quality or code streaks. GitHub scores will fall back to zero.</span>
                      </div>
                    )}

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 py-3 text-[14px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all text-center cursor-pointer shadow-sm"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="flex-1 py-3 text-[14px] font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-xl transition-all text-center cursor-pointer shadow"
                      >
                        {user?.githubConnected ? "Continue" : "Skip Connection"}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Resume Scanner */}
                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-gray-300 hover:border-[#4f46e5] rounded-2xl p-8 flex flex-col items-center justify-center bg-white/60 text-center relative hover:bg-white transition-all duration-300 cursor-pointer shadow-sm">
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={handleResumeChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploadingResume}
                        />
                        {uploadingResume ? (
                          <div className="flex flex-col items-center py-3">
                            <Loader2 className="h-9 w-9 animate-spin text-[#4f46e5] mb-3" />
                            <span className="text-[13px] font-bold text-gray-600 animate-pulse">Scanning Resume with Gemini AI...</span>
                          </div>
                        ) : user?.resumeUploaded || resumeFile ? (
                          <div className="flex flex-col items-center py-2 text-emerald-600">
                            <div className="w-11 h-11 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mb-2">
                              <Check className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="text-[14px] font-bold text-gray-700">{resumeFile?.name || "resume.pdf"}</span>
                            <span className="text-xs text-emerald-600 mt-1 font-semibold">✓ Uploaded & AI Scanned</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-3">
                            <Upload className="h-9 w-9 text-gray-400 mb-2.5" />
                            <span className="text-[14px] font-bold text-gray-700">Click or drag resume here to upload</span>
                            <span className="text-xs text-gray-500 mt-1 font-medium">Supports PDF, DOCX, and TXT (Max 5MB)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!user?.resumeUploaded && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-[11px] leading-relaxed flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>**Limited Analysis Mode Active:** Uploading your resume is highly recommended to compute ATS matching score and cross-analyze project claims against GitHub commits.</span>
                      </div>
                    )}

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex-1 py-3 text-[14px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all text-center cursor-pointer shadow-sm"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="flex-1 py-3 text-[14px] font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-xl transition-all text-center cursor-pointer shadow"
                      >
                        {user?.resumeUploaded ? "Synthesize Digital Twin" : "Skip & Synthesize"}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Launching digital twin */}
                {step === 4 && (
                  <div className="space-y-6 py-2 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                    <div className="relative w-16 h-16 flex items-center justify-center mb-1">
                      <div className="absolute inset-0 rounded-full border-4 border-[#4f46e5]/20 animate-pulse"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-[#4f46e5] animate-spin duration-1000"></div>
                      <BrainCircuit className="w-8 h-8 text-[#4f46e5] animate-pulse" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center justify-center gap-1.5" style={{ fontFamily: "Unbounded, sans-serif" }}>
                        <Sparkles className="w-4 h-4 text-[#ffc85c] animate-pulse" />
                        Calibrating Twin
                      </h3>
                      <p className="text-[12px] text-gray-500 max-w-[340px] mx-auto font-medium">
                        Running cross-analyses to map SDE growth trajectories.
                      </p>
                    </div>

                    {/* Connection Checklist status boxes */}
                    <div className="w-full max-w-xs grid gap-2 text-left bg-white/40 p-4 rounded-2xl border border-gray-150 shadow-inner text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">1. Google Authentication</span>
                        <span className="text-emerald-600 font-bold flex items-center gap-1">✅ Connected</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">2. GitHub Repositories</span>
                        {user?.githubConnected ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">✅ Connected</span>
                        ) : (
                          <span className="text-amber-600 font-semibold flex items-center gap-1">⚠️ Limited Mode</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">3. Professional Resume</span>
                        {user?.resumeUploaded ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">✅ Scanned</span>
                        ) : (
                          <span className="text-amber-600 font-semibold flex items-center gap-1">⚠️ Not Scanned</span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full max-w-xs bg-gray-200/60 border border-gray-300/30 h-3 rounded-full overflow-hidden p-0.5 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-[#4f46e5] to-[#06b6d4] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>

                    {/* Generating Logs console */}
                    <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl p-4 h-28 overflow-y-auto text-left font-mono text-[10px] text-emerald-400 space-y-1 shadow-2xl">
                      <div className="text-gray-500">&gt; Starting digital twin calibration...</div>
                      {generationLogs.map((log, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <span className="text-gray-500">&gt;</span> {log}
                        </div>
                      ))}
                      {generationProgress === 100 && (
                        <div className="text-emerald-400 font-bold animate-pulse">&gt; Calibration completed. Synchronizing session...</div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </section>

          <div className="vector-1" style={{ top: "8%", left: "8%" }}></div>
          <div className="vector-2" style={{ top: "6%", left: "80%" }}></div>
          <div className="vector-3" style={{ top: "82%", left: "45%" }}></div>

        </main>
      </div>
    </div>
  );
}
