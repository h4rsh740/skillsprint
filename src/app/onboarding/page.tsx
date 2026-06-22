"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Brain, 
  Loader2, 
  Upload, 
  Check, 
  ArrowRight, 
  Sparkles, 
  User, 
  GraduationCap, 
  FileText,
  AlertCircle
} from "lucide-react";
import { Shader, ChromaFlow, FilmGrain, FlutedGlass, Swirl } from "shaders/react";

export default function OnboardingPage() {
  const { user, loading, updateOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!resumeFile) {
        setError("Please upload your PDF resume to continue");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!githubConnected && !githubUsername) {
        setError("Please connect your GitHub profile to continue");
        return;
      }
      setStep(4);
    } else if (step === 4) {
      // Connect LinkedIn step
      setStep(5);
      startTwinGeneration();
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
      }, 1500);
    } else {
      setError("Please upload a valid PDF file");
    }
  };

  const handleConnectGithub = () => {
    if (!githubUsername) {
      setError("Please enter a valid GitHub username");
      return;
    }
    setConnectingGithub(true);
    setError("");
    setTimeout(() => {
      setGithubConnected(true);
      setConnectingGithub(false);
    }, 1500);
  };

  const handleConnectLinkedin = () => {
    setConnectingLinkedin(true);
    setError("");
    setTimeout(() => {
      setLinkedinConnected(true);
      setConnectingLinkedin(false);
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
        // Save additional fields into Firestore user object
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
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save onboarding details");
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#090D16] font-sans text-white p-4 overflow-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <Shader>
          <Swirl colorA="#05070c" colorB="#0a0f1d" detail={1.7} />
          <ChromaFlow baseColor="#05070c" downColor="#4f46e5" leftColor="#06b6d4" rightColor="#8b5cf6" upColor="#6366f1" momentum={12} radius={3.0} />
          <FlutedGlass aberration={0.61} angle={31} frequency={8} highlight={0.12} highlightSoftness={0} lightAngle={-90} refraction={4} shape="rounded" softness={1} speed={0.15} />
          <FilmGrain strength={0.05} />
        </Shader>
      </div>

      <div className="relative z-10 w-full max-w-[680px] py-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Onboarding Progress Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-3 shadow-xl backdrop-blur-md">
            <Brain className="w-6 h-6 text-[#06b6d4]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Student Onboarding</h2>
          <p className="text-[13.5px] text-gray-400 mt-1">Configure your digital twin model parameters</p>
          
          {/* Progress dots */}
          <div className="flex items-center gap-2.5 mt-5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s === step 
                    ? "w-8 bg-[#06b6d4]" 
                    : s < step 
                      ? "w-4 bg-emerald-500" 
                      : "w-4 bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Form Container Card */}
        <div className="liquid-glass bg-[#0e1726]/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-2xl text-[13px] mb-6 flex items-start gap-2.5 font-medium animate-in fade-in duration-300">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Basic Profile Setup */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="border-b border-white/10 pb-4 mb-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" />
                  Step 1: Profile Details
                </h3>
                <p className="text-xs text-gray-400 mt-1">Enter your education and target details</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12.5px] font-semibold text-gray-400 mb-1.5">Full Name</label>
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5]/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-gray-400 mb-1.5">College</label>
                  <input
                    required
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. IIT Bombay, BITS Pilani"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5]/40 transition-all"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[12.5px] font-semibold text-gray-400 mb-1.5">Branch / Field of Study</label>
                  <input
                    required
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5]/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-gray-400 mb-1.5">Graduation Year</label>
                  <input
                    required
                    type="number"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    placeholder="2026"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5]/40 transition-all"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12.5px] font-semibold text-gray-400 mb-1.5">Current CGPA (out of 10.0)</label>
                  <input
                    required
                    type="text"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    placeholder="e.g. 8.8"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5]/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-gray-400 mb-1.5">Target Career Goal</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full bg-[#182235] border border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-white focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5]/40 transition-all"
                  >
                    <option>Frontend Developer</option>
                    <option>Backend Developer</option>
                    <option>Full Stack Developer</option>
                    <option>Data Analyst</option>
                    <option>AI Engineer</option>
                    <option>Product Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-gray-400 mb-1.5">Current Skills (Comma separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="React, Node.js, Python, CSS"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5]/40 transition-all"
                />
              </div>

              <button
                onClick={handleNextStep}
                className="w-full group flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[14px] font-bold rounded-full py-3.5 transition-all shadow-lg shadow-[#4f46e5]/10 mt-6 cursor-pointer"
              >
                Continue to Resume Upload
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {/* STEP 2: Resume Upload */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="border-b border-white/10 pb-4 mb-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  Step 2: Resume Upload
                </h3>
                <p className="text-xs text-gray-400 mt-1">Upload your resume in PDF format to sync your profile</p>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-white/10 hover:border-[#06b6d4]/40 rounded-2xl p-8 flex flex-col items-center justify-center bg-[#090D16]/40 text-center relative hover:bg-[#090D16]/60 transition-all duration-300 cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleResumeChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingResume}
                  />
                  {uploadingResume ? (
                    <div className="flex flex-col items-center py-4">
                      <Loader2 className="h-10 w-10 animate-spin text-[#06b6d4] mb-3" />
                      <span className="text-[13.5px] font-bold text-slate-300 animate-pulse">Scanning PDF elements...</span>
                    </div>
                  ) : resumeFile ? (
                    <div className="flex flex-col items-center py-2 text-emerald-400">
                      <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                        <Check className="h-6 w-6 text-emerald-400" />
                      </div>
                      <span className="text-[14.5px] font-bold text-slate-200">{resumeFile.name}</span>
                      <span className="text-xs text-emerald-400/80 mt-1">✓ Resume Uploaded & Parsed</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <Upload className="h-10 w-10 text-gray-400 mb-3" />
                      <span className="text-[13.5px] font-bold text-slate-200">Click or drag PDF here to upload</span>
                      <span className="text-xs text-gray-500 mt-1.5">Only PDF documents up to 5MB supported</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3.5 text-[13.5px] font-bold text-slate-400 bg-white/5 hover:bg-white/10 rounded-full transition-all text-center cursor-pointer border border-white/5"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!resumeFile}
                  className="px-4 py-3.5 text-[13.5px] font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-full transition-all text-center cursor-pointer shadow-lg shadow-[#4f46e5]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Connect GitHub */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="border-b border-white/10 pb-4 mb-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                  </svg>
                  Step 3: Connect GitHub
                </h3>
                <p className="text-xs text-gray-400 mt-1">Integrate repository statistics to parameterize project metrics</p>
              </div>

              {githubConnected ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl p-5 text-center flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-bold text-[14.5px] text-slate-200">GitHub Profile Synced</div>
                    <div className="text-xs text-emerald-400 mt-1">Connected as {githubUsername || user?.email}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12.5px] font-semibold text-gray-400 mb-1.5">GitHub Username</label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                        </svg>
                        <input
                          type="text"
                          value={githubUsername}
                          onChange={(e) => setGithubUsername(e.target.value)}
                          placeholder="e.g. octocat"
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-[14px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5]/40 transition-all"
                        />
                      </div>
                      <button
                        onClick={handleConnectGithub}
                        disabled={connectingGithub}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-[13.5px] font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        {connectingGithub ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-3.5 text-[13.5px] font-bold text-slate-400 bg-white/5 hover:bg-white/10 rounded-full transition-all text-center cursor-pointer border border-white/5"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!githubConnected}
                  className="px-4 py-3.5 text-[13.5px] font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-full transition-all text-center cursor-pointer shadow-lg shadow-[#4f46e5]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Connect LinkedIn */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="border-b border-white/10 pb-4 mb-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                  Step 4: Connect LinkedIn
                </h3>
                <p className="text-xs text-gray-400 mt-1">Import LinkedIn profile details to verify career history</p>
              </div>

              {linkedinConnected ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl p-5 text-center flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-bold text-[14.5px] text-slate-200">LinkedIn Profile Synced</div>
                    <div className="text-xs text-emerald-400 mt-1">Connected as {user?.email}</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <button
                    onClick={handleConnectLinkedin}
                    disabled={connectingLinkedin}
                    className="flex items-center gap-2.5 bg-[#0077b5] hover:bg-[#00669c] text-white text-[14px] font-semibold py-3 px-6 rounded-2xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {connectingLinkedin ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                        </svg>
                        <span>Connect LinkedIn Profile</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-gray-500 mt-3">Link your profile data to complete onboarding verified credentials</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-3.5 text-[13.5px] font-bold text-slate-400 bg-white/5 hover:bg-white/10 rounded-full transition-all text-center cursor-pointer border border-white/5"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  className="px-4 py-3.5 text-[13.5px] font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-full transition-all text-center cursor-pointer shadow-lg shadow-[#4f46e5]/10"
                >
                  {linkedinConnected ? "Continue" : "Skip & Continue"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Generate Career Twin */}
          {step === 5 && (
            <div className="space-y-8 py-4 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                <div className="absolute inset-0 rounded-full border-4 border-[#06b6d4]/20 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#06b6d4] animate-spin duration-1000"></div>
                <Brain className="w-10 h-10 text-[#06b6d4] animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-100 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
                  Projecting Career Twin
                </h3>
                <p className="text-xs text-gray-400 max-w-[340px] mx-auto">
                  Aggregating parameters to render your interactive professional twin model
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-sm bg-white/5 border border-white/10 h-3 rounded-full overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-[#4f46e5] to-[#06b6d4] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${generationProgress}%` }}
                />
              </div>

              {/* Generating Logs (simulated console logs) */}
              <div className="w-full max-w-sm bg-[#090D16]/60 border border-white/5 rounded-2xl p-4 h-36 overflow-y-auto text-left font-mono text-[11px] text-[#06b6d4] space-y-1.5 shadow-inner">
                <div className="text-slate-500">&gt; Initializing synthesis core...</div>
                {generationLogs.map((log, i) => (
                  <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="text-slate-500">&gt;</span> {log}
                  </div>
                ))}
                {generationProgress === 100 && (
                  <div className="text-emerald-400 font-bold animate-pulse">&gt; Twin generated successfully. Launching...</div>
                )}
              </div>

              {saving && (
                <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-[#06b6d4]" />
                  Finalizing onboarding parameters...
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
