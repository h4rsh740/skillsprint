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
  AlertCircle
} from "lucide-react";
import "../auth/auth.css";

const careerSkillsMap: Record<string, string[]> = {
  "Frontend Developer": ["React", "TypeScript", "CSS", "HTML", "Next.js", "Tailwind CSS", "JavaScript"],
  "Backend Developer": ["Node.js", "Python", "Go", "Java", "PostgreSQL", "MongoDB", "Docker", "REST APIs"],
  "Full Stack Developer": ["React", "Node.js", "TypeScript", "Next.js", "PostgreSQL", "MongoDB", "Docker", "AWS"],
  "Data Analyst": ["SQL", "Python", "Tableau", "Power BI", "Excel", "Pandas", "Statistics"],
  "AI Engineer": ["Python", "PyTorch", "TensorFlow", "OpenAI API", "Hugging Face", "LLMs", "Machine Learning"],
  "Product Manager": ["Product Roadmap", "Agile/Scrum", "SQL", "A/B Testing", "Market Research", "User Analytics"]
};

export default function OnboardingPage() {
  const { user, loading, updateOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Face tracker & reaction states
  const [authStatus, setAuthStatus] = useState<"idle" | "success" | "error">("idle");
  const eyes1Ref = useRef<HTMLDivElement>(null);
  const eyes2Ref = useRef<HTMLDivElement>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [graduationYear, setGraduationYear] = useState("2026");
  const [cgpa, setCgpa] = useState("");
  const [targetRole, setTargetRole] = useState("Frontend Developer");
  const [skills, setSkills] = useState("");

  // Step 2 Resume states
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Step 3 GitHub states
  const [githubUsername, setGithubUsername] = useState("");
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);

  // Step 4 LinkedIn states
  const [connectingLinkedin, setConnectingLinkedin] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);

  // Step 5 Generating states
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

  // Initialize fields once user is loaded
  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      if (user.githubConnected) {
        setGithubConnected(true);
      }
      if (user.linkedinConnected) {
        setLinkedinConnected(true);
      }
    }
  }, [user]);

  // If already onboarded, redirect
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
      setTimeout(() => {
        setAuthStatus("idle");
        setStep(2);
      }, 600);
    } else if (step === 2) {
      if (!resumeFile) {
        setError("Please upload your PDF resume to continue");
        setAuthStatus("error");
        setTimeout(() => setAuthStatus("idle"), 1500);
        return;
      }
      setAuthStatus("success");
      setTimeout(() => {
        setAuthStatus("idle");
        setStep(3);
      }, 600);
    } else if (step === 3) {
      if (!githubConnected && !githubUsername) {
        setError("Please connect your GitHub profile to continue");
        setAuthStatus("error");
        setTimeout(() => setAuthStatus("idle"), 1500);
        return;
      }
      setAuthStatus("success");
      setTimeout(() => {
        setAuthStatus("idle");
        setStep(4);
      }, 600);
    } else if (step === 4) {
      setAuthStatus("success");
      setTimeout(() => {
        setAuthStatus("idle");
        setStep(5);
        startTwinGeneration();
      }, 600);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadingResume(true);
      setError("");
      setTimeout(() => {
        setResumeFile(file);
        setUploadingResume(false);
        setAuthStatus("success");
        setTimeout(() => setAuthStatus("idle"), 1000);
      }, 1500);
    } else {
      setError("Please upload a valid PDF file");
      setAuthStatus("error");
      setTimeout(() => setAuthStatus("idle"), 1500);
    }
  };

  const handleConnectGithub = () => {
    if (!githubUsername) {
      setError("Please enter a valid GitHub username");
      setAuthStatus("error");
      setTimeout(() => setAuthStatus("idle"), 1500);
      return;
    }
    setConnectingGithub(true);
    setError("");
    setTimeout(() => {
      setGithubConnected(true);
      setConnectingGithub(false);
      setAuthStatus("success");
      setTimeout(() => setAuthStatus("idle"), 1500);
    }, 1500);
  };

  const handleConnectLinkedin = () => {
    setConnectingLinkedin(true);
    setError("");
    setTimeout(() => {
      setLinkedinConnected(true);
      setConnectingLinkedin(false);
      setAuthStatus("success");
      setTimeout(() => setAuthStatus("idle"), 1500);
    }, 1500);
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
        
        // Add log messages at certain milestones
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
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await updateOnboarding({
        name: fullName,
        githubConnected: githubConnected,
        linkedinConnected: linkedinConnected,
        careerTwinGenerated: true,
        onboardingCompleted: true,
        ...({
          college,
          branch,
          graduationYear: parseInt(graduationYear) || 2026,
          cgpa: parseFloat(cgpa) || 0,
          targetRole,
          skills: skillsArray,
          resumeName: resumeFile?.name || "",
        } as any)
      });
      setAuthStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to save onboarding details");
      setAuthStatus("error");
      setTimeout(() => setAuthStatus("idle"), 2000);
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

  if (loading) return null;

  const stepsList = [
    { id: 1, label: "Profile Details" },
    { id: 2, label: "Resume Upload" },
    { id: 3, label: "Connect GitHub" },
    { id: 4, label: "Connect LinkedIn" },
    { id: 5, label: "Generate Twin" }
  ];

  const availableSkills = careerSkillsMap[targetRole] || [];

  return (
    <div className="auth-wrapper" style={{ padding: "15px 10px", minHeight: "100vh", display: "flex", alignItems: "center" }}>
      {/* Stylesheet rule for compact form sizing and display behavior */}
      <style>{`
        /* Mobile responsive override */
        @media only screen and (max-width: 720px) {
          .login-container {
            flex-direction: column !important;
          }
          .social-login {
            display: none !important;
          }
          .email-login {
            padding: 20px 16px !important;
          }
        }

        /* Compact form overrides to fit screen without scrolling */
        .auth-form {
          gap: 16px !important;
        }
        .auth-form input[type="text"],
        .auth-form input[type="email"],
        .auth-form input[type="password"] {
          line-height: 2.1 !important;
          font-size: 15px !important;
          padding: 0 10px !important;
        }
        .auth-label span {
          font-size: 15px !important;
          top: 7px !important;
          padding: 2px 8px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: calc(100% - 24px) !important;
          transition: all 0.2s ease-in-out !important;
        }
        .auth-label:focus-within span,
        .auth-label .focus-span {
          max-width: none !important;
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: nowrap !important;
          transform: translate(0.27rem, -90%) scale(0.8) !important;
        }
        .auth-form button[type="submit"] {
          font-size: 16px !important;
          padding: 10px !important;
          margin-top: 16px !important;
          margin-bottom: 4px !important;
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
            <div className="login-container" style={{ width: "100%", maxWidth: "980px", marginTop: "10px" }}>
              
              {/* Left Panel: Step progress checklist */}
              <div className="social-login" style={{ flex: "1.1", padding: "30px 25px", gap: "28px" }}>
                <Link href="/" className="auth-logo cursor-pointer hover:opacity-90 transition-opacity">
                  <BrainCircuit className="text-[#ffc85c]" />
                  <p style={{ fontSize: "20px" }}>SkillSprint AI</p>
                </Link>
                
                <div>
                  <h2 className="text-lg font-bold text-white mb-1.5" style={{ fontFamily: "Unbounded, sans-serif" }}>Onboarding</h2>
                  <p className="text-[12.5px] text-white/80 leading-relaxed">Configure your digital twin model parameters in 5 quick steps.</p>
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
                
                {/* Mobile-Only Header */}
                <div className="sm:hidden flex items-center justify-between mb-3">
                  <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <BrainCircuit className="text-[#ee7344] w-5.5 h-5.5" />
                    <span className="font-bold text-[15px] text-black" style={{ fontFamily: "Unbounded, sans-serif" }}>SkillSprint AI</span>
                  </Link>
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Step {step} of 5</span>
                </div>

                {/* Mobile-Only Progress Bar */}
                <div className="sm:hidden w-full flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
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
                    {step === 2 && "Resume Upload"}
                    {step === 3 && "Connect GitHub"}
                    {step === 4 && "Connect LinkedIn"}
                    {step === 5 && "Launching Twin"}
                  </h1>
                  <p className="text-[13px] text-gray-500 leading-relaxed">
                    {step === 1 && "Academic details and career direction."}
                    {step === 2 && "Upload your resume in PDF format."}
                    {step === 3 && "Integrate repository statistics to track metrics."}
                    {step === 4 && "Link LinkedIn profile to verify career details."}
                    {step === 5 && "Generating your interactive career twin projection."}
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-md text-[13px] mb-5 flex items-start gap-2 font-sans font-semibold animate-in fade-in duration-300">
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
                      <label className="auth-label" htmlFor="fullName">
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

                      <label className="auth-label" htmlFor="college">
                        <input
                          id="college"
                          type="text"
                          autoComplete="off"
                          value={college}
                          onChange={(e) => setCollege(e.target.value)}
                          required
                        />
                        <span className={college ? "focus-span" : ""}>College</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <select
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="w-full bg-white border border-[#ccc] rounded-[4px] px-3 text-[15px] text-black focus:outline-none focus:ring-1 focus:ring-[#ffc85c] focus:border-[#ffc85c] transition-all"
                          style={{ height: "39px", appearance: "none", paddingTop: "0px", paddingBottom: "0px" }}
                        >
                          <option value="">Select Branch</option>
                          <option>Computer Science</option>
                          <option>Information Technology</option>
                          <option>Electronics Engineering</option>
                          <option>Electrical Engineering</option>
                          <option>Mechanical Engineering</option>
                          <option>Civil Engineering</option>
                          <option>Mathematics & Computing</option>
                          <option>Business Administration</option>
                          <option>Other</option>
                        </select>
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">▼</span>
                        <span className="absolute left-2.5 -top-2 px-1 bg-white text-[11px] text-gray-500 font-semibold">Branch / Field of Study</span>
                      </div>

                      <div className="relative">
                        <select
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value)}
                          className="w-full bg-white border border-[#ccc] rounded-[4px] px-3 text-[15px] text-black focus:outline-none focus:ring-1 focus:ring-[#ffc85c] focus:border-[#ffc85c] transition-all"
                          style={{ height: "39px", appearance: "none", paddingTop: "0px", paddingBottom: "0px" }}
                        >
                          <option>2024</option>
                          <option>2025</option>
                          <option>2026</option>
                          <option>2027</option>
                          <option>2028</option>
                          <option>2029</option>
                        </select>
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">▼</span>
                        <span className="absolute left-2.5 -top-2 px-1 bg-white text-[11px] text-gray-500 font-semibold">Graduation Year</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="auth-label" htmlFor="cgpa">
                        <input
                          id="cgpa"
                          type="text"
                          autoComplete="off"
                          value={cgpa}
                          onChange={(e) => setCgpa(e.target.value)}
                          required
                        />
                        <span className={cgpa ? "focus-span" : ""}>Current CGPA (out of 10.0)</span>
                      </label>

                      <div className="relative">
                        <select
                          value={targetRole}
                          onChange={(e) => {
                            setTargetRole(e.target.value);
                            setSkills("");
                          }}
                          className="w-full bg-white border border-[#ccc] rounded-[4px] px-3 text-[15px] text-black focus:outline-none focus:ring-1 focus:ring-[#ffc85c] focus:border-[#ffc85c] transition-all"
                          style={{ height: "39px", appearance: "none", paddingTop: "0px", paddingBottom: "0px" }}
                        >
                          <option>Frontend Developer</option>
                          <option>Backend Developer</option>
                          <option>Full Stack Developer</option>
                          <option>Data Analyst</option>
                          <option>AI Engineer</option>
                          <option>Product Manager</option>
                        </select>
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">▼</span>
                        <span className="absolute left-2.5 -top-2 px-1 bg-white text-[12px] text-gray-500 font-semibold">Target Career Goal</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="auth-label" htmlFor="skills">
                        <input
                          id="skills"
                          type="text"
                          autoComplete="off"
                          value={skills}
                          onChange={(e) => setSkills(e.target.value)}
                          required
                        />
                        <span className={skills ? "focus-span" : ""}>Current Skills (Comma separated)</span>
                      </label>
                      
                      {/* Skill Pills Selection container */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {availableSkills.map((skill) => {
                          const isSelected = skills.split(",").map(s => s.trim()).includes(skill);
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => toggleSkill(skill)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#ee7344] border-[#ee7344] text-white shadow-sm"
                                  : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {isSelected ? "✓ " : "+ "}
                              {skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button type="submit">
                      Continue to Resume Upload <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  </form>
                )}

                {/* STEP 2: Resume Upload */}
                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-gray-300 hover:border-[#74959a] rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 text-center relative hover:bg-gray-100/80 transition-all duration-300 cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleResumeChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploadingResume}
                        />
                        {uploadingResume ? (
                          <div className="flex flex-col items-center py-3">
                            <Loader2 className="h-9 w-9 animate-spin text-[#ee7344] mb-3" />
                            <span className="text-[13px] font-bold text-gray-600 animate-pulse">Scanning PDF...</span>
                          </div>
                        ) : resumeFile ? (
                          <div className="flex flex-col items-center py-2 text-emerald-600">
                            <div className="w-11 h-11 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mb-2">
                              <Check className="h-5 w-5 text-emerald-600" />
                            </div>
                            <span className="text-[14px] font-bold text-gray-700">{resumeFile.name}</span>
                            <span className="text-xs text-emerald-600 mt-1 font-semibold">✓ Uploaded & Parsed</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-3">
                            <Upload className="h-9 w-9 text-gray-400 mb-2.5" />
                            <span className="text-[14px] font-bold text-gray-700">Click or drag PDF here to upload</span>
                            <span className="text-xs text-gray-500 mt-1 font-medium">PDF documents up to 5MB</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 py-2 text-[15px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-[3px] transition-all text-center cursor-pointer"
                        style={{ boxShadow: "0.2rem 0.2rem #111827" }}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        disabled={!resumeFile}
                        className="flex-1 py-2 text-[15px] font-bold text-white bg-[#ea5455] hover:brightness-95 rounded-[3px] transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ boxShadow: "0.2rem 0.2rem #111827" }}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Connect GitHub */}
                {step === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    {githubConnected ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-5 text-center flex flex-col items-center gap-2.5 animate-in zoom-in-95 duration-300">
                        <div className="w-10 h-10 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center">
                          <Check className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-bold text-[14px]">GitHub Profile Synced</div>
                          <div className="text-xs text-emerald-600 mt-1 font-semibold">Connected as {githubUsername || user?.email}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <label className="auth-label" htmlFor="githubUsername">
                              <input
                                id="githubUsername"
                                type="text"
                                value={githubUsername}
                                onChange={(e) => setGithubUsername(e.target.value)}
                                required
                                style={{ paddingLeft: "42px" }}
                              />
                              <svg className="absolute left-3.5 top-[11px] w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                              </svg>
                              <span className={githubUsername ? "focus-span" : ""} style={{ left: "32px" }}>GitHub Username</span>
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={handleConnectGithub}
                            disabled={connectingGithub}
                            className="px-5 py-2 bg-[#74959a] hover:brightness-95 text-white text-[14px] font-bold rounded-[3px] transition-all cursor-pointer disabled:opacity-50"
                            style={{ height: "39px", boxShadow: "0.2rem 0.2rem #111827", minWidth: "110px" }}
                          >
                            {connectingGithub ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-black" /> : "Connect"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex-1 py-2 text-[15px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-[3px] transition-all text-center cursor-pointer"
                        style={{ boxShadow: "0.2rem 0.2rem #111827" }}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        disabled={!githubConnected}
                        className="flex-1 py-2 text-[15px] font-bold text-white bg-[#ea5455] hover:brightness-95 rounded-[3px] transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ boxShadow: "0.2rem 0.2rem #111827" }}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Connect LinkedIn */}
                {step === 4 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    {linkedinConnected ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-5 text-center flex flex-col items-center gap-2.5 animate-in zoom-in-95 duration-300">
                        <div className="w-10 h-10 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center">
                          <Check className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-bold text-[14px]">LinkedIn Profile Synced</div>
                          <div className="text-xs text-emerald-600 mt-1 font-semibold">Connected as {user?.email}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <button
                          type="button"
                          onClick={handleConnectLinkedin}
                          disabled={connectingLinkedin}
                          className="flex items-center justify-center gap-2 bg-[#0077b5] hover:bg-[#00669c] text-white text-[14px] font-bold py-2.5 px-6 rounded-[3px] transition-all cursor-pointer"
                          style={{ boxShadow: "0.2rem 0.2rem #111827", width: "100%", maxWidth: "260px" }}
                        >
                          {connectingLinkedin ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                              </svg>
                              <span>Connect LinkedIn Profile</span>
                            </>
                          )}
                        </button>
                        <span className="text-xs text-gray-500 mt-3 font-semibold">Verify details directly via LinkedIn</span>
                      </div>
                    )}

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="flex-1 py-2 text-[15px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-[3px] transition-all text-center cursor-pointer"
                        style={{ boxShadow: "0.2rem 0.2rem #111827" }}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="flex-1 py-2 text-[15px] font-bold text-white bg-[#ea5455] hover:brightness-95 rounded-[3px] transition-all text-center cursor-pointer"
                        style={{ boxShadow: "0.2rem 0.2rem #111827" }}
                      >
                        {linkedinConnected ? "Continue" : "Skip & Continue"}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: Generate Career Twin */}
                {step === 5 && (
                  <div className="space-y-4 py-2 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="relative w-16 h-16 flex items-center justify-center mb-1">
                      <div className="absolute inset-0 rounded-full border-4 border-[#ee7344]/20 animate-pulse"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-t-[#ee7344] animate-spin duration-1000"></div>
                      <BrainCircuit className="w-8 h-8 text-[#ee7344] animate-pulse" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center justify-center gap-1.5" style={{ fontFamily: "Unbounded, sans-serif" }}>
                        <Sparkles className="w-4 h-4 text-[#ffc85c] animate-spin" />
                        Projecting Twin
                      </h3>
                      <p className="text-[11.5px] text-gray-500 max-w-[300px] mx-auto font-semibold">
                        Aggregating parameters to render your model.
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full max-w-xs bg-gray-100 border border-gray-200 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="bg-gradient-to-r from-[#ee7344] to-[#ffc85c] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>

                    {/* Generating Logs */}
                    <div className="w-full max-w-xs bg-gray-900 border border-gray-800 rounded-xl p-4 h-28 overflow-y-auto text-left font-mono text-[10px] text-[#ffc85c] space-y-1 shadow-inner">
                      <div className="text-gray-500">&gt; Initializing synthesis core...</div>
                      {generationLogs.map((log, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <span className="text-gray-500">&gt;</span> {log}
                        </div>
                      ))}
                      {generationProgress === 100 && (
                        <div className="text-emerald-400 font-bold animate-pulse">&gt; Twin generated successfully. Launching...</div>
                      )}
                    </div>

                    {saving && (
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 animate-pulse font-semibold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ee7344]" />
                        Finalizing parameters...
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </section>

          {/* Decorative Vectors */}
          <div className="vector-1" style={{ top: "8%", left: "8%" }}></div>
          <div className="vector-2" style={{ top: "6%", left: "80%" }}></div>
          <div className="vector-3" style={{ top: "82%", left: "45%" }}></div>

        </main>
      </div>
    </div>
  );
}
