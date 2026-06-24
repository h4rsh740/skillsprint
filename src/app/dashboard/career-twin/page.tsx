"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Briefcase, ChevronDown, TrendingUp, RefreshCw, ArrowRight, Award, Compass, ShieldAlert, ShieldCheck, Zap, Rocket, Coins, Sparkles, Download, BarChart2, GitBranch, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { generateCareerTwin, getStudentProfileForTwin, type CareerTwinResult } from "@/actions/career-twin";
import "../../auth/auth.css";

// ──────────────────────────────────────────────
// PDF Export: Career Twin Trajectory Report
// ──────────────────────────────────────────────
function exportCareerTwinToPDF(result: CareerTwinResult, meta: { cgpa: string; targetRole: string; skills: string }) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to export as PDF");
    return;
  }

  const phaseColors: string[] = ["#4f46e5", "#06b6d4", "#3b82f6", "#10b981"];
  const phaseBg: string[]     = ["#ede9fe", "#cffafe", "#dbeafe", "#d1fae5"];
  const phaseText: string[]   = ["#4338ca", "#0e7490", "#1d4ed8", "#065f46"];

  const timelineHTML = result.timeline.map((item, idx) => {
    const color   = phaseColors[idx % phaseColors.length];
    const bg      = phaseBg[idx % phaseBg.length];
    const text    = phaseText[idx % phaseText.length];
    const skillTags = item.skills.map(s =>
      `<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:${bg};color:${text};font-size:10px;font-weight:700;margin:2px 3px 2px 0;border:1px solid ${color}33;">${s}</span>`
    ).join('');

    const resourcesHTML = item.resources && item.resources.length > 0
      ? `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #e2e8f0;">
          <p style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px 0;">🚀 Free Learning Resources</p>
          ${item.resources.map(r =>
            `<p style="margin:3px 0;font-size:11px;color:#4f46e5;">→ <a href="${r.url}" style="color:#4f46e5;text-decoration:underline;">${r.name}</a></p>`
          ).join('')}
        </div>`
      : '';

    const salaryBadge = item.salary && item.salary !== "N/A" && item.salary !== "0"
      ? `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#d1fae5;color:#065f46;font-size:10px;font-weight:800;border:1px solid #6ee7b7;">💰 ${item.salary}</span>`
      : `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#f1f5f9;color:#94a3b8;font-size:10px;font-weight:700;border:1px solid #e2e8f0;">Learning Phase</span>`;

    return `
      <div style="display:flex;gap:18px;margin-bottom:24px;page-break-inside:avoid;">
        <!-- Node -->
        <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
          <div style="width:38px;height:38px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:900;box-shadow:0 0 0 4px ${bg};">
            ${idx + 1}
          </div>
          ${idx < result.timeline.length - 1 ? `<div style="width:2px;background:linear-gradient(to bottom,${color},${phaseColors[(idx+1)%phaseColors.length]});flex:1;min-height:32px;margin:4px 0;"></div>` : ''}
        </div>
        <!-- Card -->
        <div style="flex:1;background:#f8fafc;border:1px solid ${color}33;border-left:4px solid ${color};border-radius:12px;padding:16px 18px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <span style="padding:3px 10px;border-radius:999px;background:${bg};color:${text};font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">${item.month}</span>
            ${salaryBadge}
          </div>
          <h3 style="margin:0 0 4px 0;font-size:15px;font-weight:800;color:#0f172a;">${item.title}</h3>
          <p style="margin:0 0 10px 0;font-size:12px;color:#64748b;font-weight:500;">${item.subtitle}</p>
          <div style="margin-bottom:4px;">${skillTags}</div>
          ${resourcesHTML}
        </div>
      </div>
    `;
  }).join('');

  const swotSections: Array<{
    key: keyof NonNullable<CareerTwinResult["swot"]>;
    label: string;
    letter: string;
    bg: string;
    border: string;
    text: string;
  }> = [
    { key: 'strengths', label: 'Strengths', letter: 'S', bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
    { key: 'weaknesses', label: 'Weaknesses', letter: 'W', bg: '#fff1f2', border: '#fda4af', text: '#be123c' },
    { key: 'opportunities', label: 'Opportunities', letter: 'O', bg: '#f0f9ff', border: '#7dd3fc', text: '#0369a1' },
    { key: 'threats', label: 'Threats', letter: 'T', bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  ];

  const swotCards = swotSections.map(({ key, label, letter, bg, border, text }) => {
    const items = result.swot?.[key] ?? [];
    return `
      <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:14px 16px;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <div style="width:26px;height:26px;border-radius:50%;background:white;border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:${text};">${letter}</div>
          <span style="font-size:12px;font-weight:800;color:${text};">${label}</span>
        </div>
        <ul style="margin:0;padding:0 0 0 14px;list-style:disc;">
          ${items.map(s => `<li style="font-size:11.5px;color:#334155;line-height:1.6;margin-bottom:4px;font-weight:500;">${s}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');

  const rolesHTML = (result.recommendedRoles || []).map((role, idx) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:26px;height:26px;border-radius:8px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#4f46e5;">#${idx+1}</div>
        <div>
          <p style="margin:0;font-size:13px;font-weight:800;color:#0f172a;">${role.title}</p>
          <p style="margin:2px 0 0 0;font-size:10.5px;color:#94a3b8;font-weight:500;">${role.description}</p>
        </div>
      </div>
      <span style="padding:4px 10px;background:#ede9fe;border:1px solid #c4b5fd;color:#4f46e5;font-size:10px;font-weight:900;border-radius:6px;white-space:nowrap;">${role.match}% Match</span>
    </div>
  `).join('');

  const readiness = result.placementReadiness || 0;
  const readinessColor = readiness >= 80 ? '#10b981' : readiness >= 60 ? '#f59e0b' : '#ef4444';
  const readinessBg    = readiness >= 80 ? '#d1fae5' : readiness >= 60 ? '#fef3c7' : '#fee2e2';
  const readinessMsg   = readiness >= 80
    ? "Outstanding placement probability! Your profile meets high-bar hiring standards."
    : readiness >= 60
    ? "Good potential. Address the SWOT weaknesses to maximize shortlisting chances."
    : "Priority updates required. Enhance your project portfolio and skill diversity.";

  printWindow.document.write(`
    <html>
      <head>
        <title>SkillSprint AI Career Twin Report</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          @page { size: A4; margin: 18mm; }
          @media print {
            body { padding: 0; margin: 0; }
            .no-print { display: none !important; }
          }
          body {
            font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
            color: #334155;
            background: #ffffff;
            max-width: 760px;
            margin: 0 auto;
            padding: 24px 32px;
          }
          a { color: #4f46e5; }
          h2.section-title {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin: 32px 0 14px 0;
            padding-left: 12px;
            border-left: 4px solid #4f46e5;
            display: flex;
            align-items: center;
            gap: 8px;
          }
        </style>
      </head>
      <body>
        <!-- Top accent bar -->
        <div style="height:5px;background:linear-gradient(to right,#4f46e5,#06b6d4,#10b981);border-radius:4px;margin-bottom:24px;"></div>

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
          <div>
            <span style="font-size:8px;font-weight:900;letter-spacing:0.15em;color:#4f46e5;text-transform:uppercase;">SkillSprint Career GPS</span>
            <h1 style="margin:4px 0 0 0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">AI Career Twin Report</h1>
            <p style="margin:4px 0 0 0;font-size:11px;color:#94a3b8;font-weight:500;">12-Month Projected Trajectory &amp; SWOT Intelligence</p>
          </div>
          <div style="background:#ede9fe;border:1px solid #c4b5fd;color:#4f46e5;font-weight:800;padding:6px 14px;border-radius:999px;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;">
            SkillSprint AI Export
          </div>
        </div>

        <!-- Metadata card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-bottom:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div>
            <p style="margin:0 0 2px 0;font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">REPORT FOR</p>
            <p style="margin:0;font-size:11.5px;font-weight:700;color:#0f172a;">SkillSprint Student</p>
          </div>
          <div style="text-align:center;">
            <p style="margin:0 0 2px 0;font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">TARGET ROLE</p>
            <p style="margin:0;font-size:11.5px;font-weight:700;color:#4f46e5;">${meta.targetRole}</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0 0 2px 0;font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">GENERATED ON</p>
            <p style="margin:0;font-size:11.5px;font-weight:700;color:#0f172a;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <!-- Student snapshot -->
        <div style="background:linear-gradient(135deg,#4f46e5,#6366f1);border-radius:12px;padding:16px 20px;margin-bottom:8px;display:flex;gap:32px;">
          <div>
            <p style="margin:0 0 2px 0;font-size:8px;font-weight:800;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;">CURRENT CGPA</p>
            <p style="margin:0;font-size:22px;font-weight:900;color:white;">${meta.cgpa}</p>
          </div>
          <div>
            <p style="margin:0 0 2px 0;font-size:8px;font-weight:800;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;">PLACEMENT READINESS</p>
            <p style="margin:0;font-size:22px;font-weight:900;color:#fbbf24;">${readiness}%</p>
          </div>
          <div style="flex:1;">
            <p style="margin:0 0 4px 0;font-size:8px;font-weight:800;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;">KEY SKILLS</p>
            <p style="margin:0;font-size:11.5px;font-weight:600;color:white;opacity:0.9;">${meta.skills || "—"}</p>
          </div>
        </div>

        <!-- Readiness bar -->
        <div style="background:${readinessBg};border:1px solid ${readinessColor}33;border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:14px;">
          <div style="font-size:24px;font-weight:900;color:${readinessColor};min-width:52px;">${readiness}%</div>
          <div>
            <p style="margin:0 0 1px 0;font-size:11px;font-weight:800;color:${readinessColor};">Hiring Readiness Score</p>
            <p style="margin:0;font-size:11px;color:#475569;font-weight:500;">${readinessMsg}</p>
          </div>
        </div>

        <!-- ── Section: Career Timeline ── -->
        <h2 class="section-title">📅 12-Month Career Trajectory</h2>
        ${timelineHTML}

        <!-- ── Section: SWOT ── -->
        <h2 class="section-title">🧠 SWOT Analysis</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
          ${swotCards}
        </div>

        <!-- ── Section: Recommended Roles ── -->
        <h2 class="section-title">💼 Recommended Roles</h2>
        ${rolesHTML}

        <!-- ── AI Twin Synthesis ── -->
        ${result.recommendedRoles?.[0] ? `
        <div style="background:#faf5ff;border:1px dashed #c4b5fd;border-radius:12px;padding:14px 16px;margin-top:8px;page-break-inside:avoid;">
          <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;color:#7c3aed;">✨ AI Twin Synthesis</p>
          <p style="margin:0;font-size:12.5px;color:#334155;line-height:1.7;font-weight:500;">
            Recommended primary track is <strong style="color:#7c3aed;">${result.recommendedRoles[0].title}</strong>.<br/>
            <em style="color:#64748b;">"${result.recommendedRoles[0].reason}"</em>
          </p>
        </div>` : ''}

        <!-- Footer -->
        <div style="border-top:1px solid #e2e8f0;margin-top:40px;padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
          <p style="margin:0;font-size:9px;color:#94a3b8;">© ${new Date().getFullYear()} SkillSprint. Empowering developer trajectories.</p>
          <p style="margin:0;font-size:9px;color:#cbd5e1;font-weight:600;">Confidential Career Intelligence Document</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 400);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

const ROLE_SKILLS_MAP: Record<string, string[]> = {
  "Frontend Developer": [
    "React", "TypeScript", "Next.js", "HTML5", "CSS3", "Tailwind CSS", "Redux Toolkit", "Jest", "GraphQL"
  ],
  "Backend Developer": [
    "Node.js", "Express", "PostgreSQL", "MongoDB", "Redis", "Docker", "REST APIs", "GraphQL", "Java", "Spring Boot"
  ],
  "Full Stack Developer": [
    "React", "Node.js", "Express", "PostgreSQL", "Next.js", "Tailwind CSS", "TypeScript", "REST APIs", "Git", "Docker"
  ],
  "Data Scientist / AI Engineer": [
    "Python", "PyTorch", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn", "SQL", "Data Visualization", "Machine Learning"
  ],
  "DevOps Engineer": [
    "Docker", "Kubernetes", "AWS", "CI/CD", "GitHub Actions", "Terraform", "Linux", "Nginx", "Bash", "Prometheus"
  ],
  "Mobile App Developer": [
    "React Native", "Flutter", "Swift", "Kotlin", "Dart", "Mobile UI Design", "REST APIs", "Firebase", "App Store Deploy"
  ]
};

export default function CareerTwinPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<"idle" | "success" | "error">("idle");
  const [result, setResult] = useState<CareerTwinResult | null>(null);
  const [cgpa, setCgpa] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [skills, setSkills] = useState("");

  const [activeTab, setActiveTab] = useState<'timeline' | 'swot' | 'analytics'>('timeline');
  const [checkedSkills, setCheckedSkills] = useState<Record<string, boolean>>({});
  const [expandedSwot, setExpandedSwot] = useState<string | null>(null);
  const [countedReadiness, setCountedReadiness] = useState(0);
  const eyes1Ref = useRef<HTMLDivElement>(null);
  const eyes2Ref = useRef<HTMLDivElement>(null);
  const placementReadiness = result?.placementReadiness ?? 0;

  const isSkillActive = (skill: string) => {
    return skills
      .split(",")
      .map(s => s.trim().toLowerCase())
      .includes(skill.toLowerCase());
  };

  const handleToggleSkill = (skill: string) => {
    const skillList = skills
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const index = skillList.findIndex(s => s.toLowerCase() === skill.toLowerCase());

    if (index >= 0) {
      skillList.splice(index, 1);
    } else {
      skillList.push(skill);
    }

    setSkills(skillList.join(", "));
  };

  // Animated count-up when result loads
  useEffect(() => {
    if (!result) return;
    let start = 0;
    const target = result.placementReadiness ?? 0;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCountedReadiness(target); clearInterval(timer); }
      else setCountedReadiness(start);
    }, 20);
    return () => clearInterval(timer);
  }, [result]);

  const toggleSkill = useCallback((key: string) => {
    setCheckedSkills(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleSwot = useCallback((quad: string) => {
    setExpandedSwot(prev => prev === quad ? null : quad);
  }, []);

  const handleRoleChange = (role: string) => {
    setTargetRole(role);
    const defaultSkills = ROLE_SKILLS_MAP[role] || [];
    if (defaultSkills.length > 0) {
      setSkills(defaultSkills.join(", "));
    }
  };

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
    async function syncProfile() {
      try {
        const profile = await getStudentProfileForTwin();
        if (profile) {
          setCgpa(profile.cgpa ? String(profile.cgpa) : "");
          setTargetRole(profile.targetRole || "");
          setSkills(profile.skills || "");
        }
      } catch (err) {
        console.error("Failed to prefill Career Twin profile:", err);
      }
    }
    syncProfile();
  }, []);



  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerationStatus("idle");

    try {
      const formData = new FormData(e.currentTarget);
      const data = await generateCareerTwin(formData);
      setGenerationStatus("success");
      setTimeout(() => {
        setResult(data);
        setGenerationStatus("idle");
      }, 600);
    } catch (error) {
      console.error("Generation failed", error);
      setGenerationStatus("error");
      setTimeout(() => setGenerationStatus("idle"), 2000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="career-twin-page animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="fixed inset-0 bg-[#f5f5f5] z-[-1] pointer-events-none" />

      {!result ? (
        <div className="auth-wrapper md:min-h-[calc(100vh-120px)] min-h-0" style={{ background: "transparent" }}>
          <div className="auth-container">
            <main className="auth-main">
              <section className="auth-section">

                {/* Interactive Face Tracking */}
                <div className={`face ${generationStatus === "success" ? "face-success" : generationStatus === "error" ? "face-error" : ""}`}>
                  <img src="https://assets.codepen.io/9277864/PF.png" alt="Face" width="250" height="250" />
                  <div className="eye-cover1">
                    <div ref={eyes1Ref} className="eyes1"></div>
                  </div>
                  <div className="eye-cover2">
                    <div ref={eyes2Ref} className="eyes2"></div>
                  </div>
                </div>

                {/* Form Container Box */}
                <div className="login-container">

                  {/* Left Side: Brand Panel */}
                  <div className="social-login">
                    <Link href="/" className="auth-logo cursor-pointer hover:opacity-90 transition-opacity">
                      <BrainCircuit className="text-[#ffc85c]" />
                      <p>SkillSprint AI</p>
                    </Link>

                    <div>
                      <h2 className="text-md font-bold text-white mb-2" style={{ fontFamily: "Unbounded, sans-serif" }}>Clone Profile</h2>
                      <p className="text-[12.5px] text-white/90 leading-relaxed">
                        Configure your target parameters to model a 12-month trajectory, salary projections, and SWOT insights.
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 py-4 border-t border-white/10 mt-2 text-[13px] text-white/90">
                      <div className="flex items-center gap-3">
                        <span className="text-[#ffc85c] text-lg">🎯</span>
                        <span className="font-semibold">12-Month Salary Curve</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#ffc85c] text-lg">📈</span>
                        <span className="font-semibold">Placement Readiness Score</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#ffc85c] text-lg">💡</span>
                        <span className="font-semibold">Aggregated SWOT Insights</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Inputs Form */}
                  <div className="email-login">
                    <div className="mobile-auth-logo">
                      <div className="flex items-center gap-2 justify-center py-2">
                        <BrainCircuit className="text-[#ee7344] w-6 h-6" />
                        <span className="font-bold text-[18px] text-black" style={{ fontFamily: "Unbounded, sans-serif" }}>Career Twin</span>
                      </div>
                    </div>
                    <div className="login-h-container">
                      <h1>Configure Twin</h1>
                      <p>Prefilled from your database profile</p>
                    </div>

                    <form onSubmit={handleGenerate} className="auth-form">
                      <label className="auth-label" htmlFor="cgpa">
                        <input
                          id="cgpa"
                          required
                          name="cgpa"
                          type="text"
                          autoComplete="off"
                          value={cgpa}
                          onChange={(e) => setCgpa(e.target.value)}
                        />
                        <span className={cgpa ? "focus-span" : ""}>Current CGPA</span>
                      </label>

                      <label className="auth-label" htmlFor="targetRole">
                        <select
                          id="targetRole"
                          required
                          name="targetRole"
                          value={targetRole}
                          onChange={(e) => handleRoleChange(e.target.value)}
                        >
                          <option value="" disabled hidden></option>
                          <option value="Frontend Developer">Frontend Developer</option>
                          <option value="Backend Developer">Backend Developer</option>
                          <option value="Full Stack Developer">Full Stack Developer</option>
                          <option value="Data Scientist / AI Engineer">Data Scientist / AI Engineer</option>
                          <option value="DevOps Engineer">DevOps Engineer</option>
                          <option value="Mobile App Developer">Mobile App Developer</option>
                        </select>
                        <span className={targetRole ? "focus-span" : ""}>Target Role</span>
                      </label>

                      <label className="auth-label" htmlFor="skills">
                        <textarea
                          id="skills"
                          required
                          name="skills"
                          rows={2}
                          value={skills}
                          onChange={(e) => setSkills(e.target.value)}
                        />
                        <span className={skills ? "focus-span" : ""}>Key Skills (Comma separated)</span>
                      </label>

                      {/* Interactive Skill Chips */}
                      {targetRole && ROLE_SKILLS_MAP[targetRole] && (
                        <div className="space-y-2 animate-in fade-in duration-300 pb-1">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                            Quick Add Skills for {targetRole}
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1 pb-1 scrollbar-thin">
                            {ROLE_SKILLS_MAP[targetRole].map((skill) => {
                              const active = isSkillActive(skill);
                              return (
                                <button
                                  key={skill}
                                  type="button"
                                  onClick={() => handleToggleSkill(skill)}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all duration-200 cursor-pointer ${
                                    active
                                      ? "bg-[#4f46e5] border-[#4f46e5] text-white shadow-sm scale-102"
                                      : "bg-white border-gray-250 text-gray-650 hover:bg-gray-50 hover:border-gray-300"
                                  }`}
                                >
                                  {active ? "✓ " : "+ "}
                                  {skill}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button type="submit" disabled={isGenerating}>
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                            <span>Generating Trajectory...</span>
                          </>
                        ) : (
                          <>
                            <span>Generate Trajectory</span>
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                </div>
              </section>

              {/* Background Decorative Vectors */}
              <div className="vector-1"></div>
              <div className="vector-2"></div>
              <div className="vector-3"></div>
            </main>
          </div>
        </div>
      ) : (
        <div className="font-sans text-slate-100">
          {/* Rich dark background */}
          <div className="fixed inset-0 bg-[#0a0b14] pointer-events-none z-[-1]" />
          <div className="fixed inset-0 pointer-events-none z-[-1]" style={{ background: "radial-gradient(circle at 35% 0%, rgba(79,70,229,0.18), transparent 36%), radial-gradient(circle at 100% 75%, rgba(6,182,212,0.08), transparent 34%)" }} />

          {/* Print CSS */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              aside, .md\\:hidden, .fixed.inset-0, .no-print, button { display: none !important; }
              body, html { background: #ffffff !important; }
              main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; width: 100% !important; }
              .max-w-4xl, .max-w-5xl, .max-w-6xl { max-width: 100% !important; padding: 0 !important; }
            }
          `}} />

          {/* ── HERO BANNER ── */}
          <div className="max-w-6xl mx-auto mb-5 sm:mb-7 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#101522] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_0%,rgba(99,102,241,0.25),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.12),transparent_34%)]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent" />

              <div className="relative z-10 grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:p-9">
                <div className="max-w-2xl">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-200">Active projection</span>
                    <span className="text-xs font-medium text-slate-400">12-month career simulation</span>
                  </div>
                  <h1 className="max-w-xl text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl lg:text-[46px] lg:leading-[1.05]">Your projected career trajectory</h1>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-[15px]">
                    A practical view of the skills, milestones, and market value you can build over the next year.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Target: {targetRole || "Career goal"}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{result.timeline.length} growth phases</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                      <Coins className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Peak salary</p>
                    <p className="mt-1 text-lg font-extrabold tracking-tight text-white sm:text-xl">{result.timeline[result.timeline.length - 1]?.salary.replace(' / yr', '') || '₹12L - ₹18L'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300">
                      <Award className="h-4 w-4" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Readiness</p>
                    <p className="mt-1 text-lg font-extrabold tracking-tight text-white sm:text-xl">
                      <motion.span key={countedReadiness} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{countedReadiness}</motion.span>%
                    </p>
                  </div>
                  <button
                    onClick={() => exportCareerTwinToPDF(result, { cgpa, targetRole, skills })}
                    className="no-print col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50 cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> Download career report
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── TAB BAR ── */}
          <div className="max-w-6xl mx-auto mb-6 sm:mb-8">
            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 sm:w-fit">
              {([
                { key: 'timeline', label: 'Timeline', icon: GitBranch },
                { key: 'swot',     label: 'SWOT',     icon: BrainCircuit },
                { key: 'analytics',label: 'Analytics', icon: BarChart2 },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 cursor-pointer sm:px-5 ${
                    activeTab === key
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                      : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── TAB CONTENT ── */}
          <AnimatePresence mode="wait">

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <motion.div key="timeline" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className="relative mx-auto max-w-6xl pb-12">
                  <div className="absolute bottom-5 left-[19px] top-5 w-px bg-gradient-to-b from-indigo-500 via-cyan-500 to-emerald-500 opacity-45 sm:left-[27px]" />
                  <div className="space-y-4 sm:space-y-5">
                    {result.timeline.map((item, index) => (
                      <TimelineItem
                        key={index}
                        index={index}
                        month={item.month}
                        title={item.title}
                        subtitle={item.subtitle}
                        skills={item.skills}
                        salary={item.salary}
                        resources={item.resources}
                        active={index === 0}
                        checkedSkills={checkedSkills}
                        onToggleSkill={toggleSkill}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SWOT TAB */}
            {activeTab === 'swot' && (
              <motion.div key="swot" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className="max-w-6xl mx-auto">
                  <div className="rounded-[22px] border border-white/10 overflow-hidden shadow-2xl" style={{ background: "linear-gradient(135deg, #111827 0%, #0f172a 100%)" }}>
                    <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center"><BrainCircuit className="w-4 h-4 text-indigo-400" /></div>
                        <div>
                          <h3 className="text-[14px] font-bold text-white">SWOT Analysis</h3>
                          <p className="text-[11px] text-slate-500">Click any quadrant to expand details</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 text-[11px] font-black rounded-full border border-emerald-500/20">92% Confidence</span>
                    </div>

                    {([
                      { key: 'strengths',    label: 'Strengths',    icon: ShieldCheck, color: 'emerald', bg: '#0d1f17', hoverBg: '#102318', items: result.swot?.strengths ?? [] },
                      { key: 'weaknesses',   label: 'Weaknesses',   icon: Zap,         color: 'rose',    bg: '#1f0d0d', hoverBg: '#231010', items: result.swot?.weaknesses ?? [] },
                      { key: 'opportunities',label: 'Opportunities', icon: Compass,     color: 'sky',     bg: '#0d1520', hoverBg: '#101825', items: result.swot?.opportunities ?? [] },
                      { key: 'threats',      label: 'Threats',      icon: ShieldAlert,  color: 'amber',   bg: '#1a1508', hoverBg: '#1e190a', items: result.swot?.threats ?? [] },
                    ] as const).map(({ key, label, icon: Icon, color, bg, hoverBg, items }) => {
                      const isOpen = expandedSwot === key;
                      const colorMap: Record<string, string> = { emerald: 'text-emerald-400', rose: 'text-rose-400', sky: 'text-sky-400', amber: 'text-amber-400' };
                      const dotMap: Record<string, string> = { emerald: 'bg-emerald-500', rose: 'bg-rose-500', sky: 'bg-sky-500', amber: 'bg-amber-500' };
                      const iconBgMap: Record<string, string> = { emerald: 'bg-emerald-500/20', rose: 'bg-rose-500/20', sky: 'bg-sky-500/20', amber: 'bg-amber-500/20' };
                      return (
                        <div key={key} style={{ background: isOpen ? hoverBg : bg }} className="border-b border-white/5 last:border-0 transition-colors">
                          <button
                            onClick={() => toggleSwot(key)}
                            className="w-full flex items-center justify-between px-6 py-4 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-md ${iconBgMap[color]} flex items-center justify-center`}>
                                <Icon className={`w-3.5 h-3.5 ${colorMap[color]}`} />
                              </div>
                              <span className={`text-[13px] font-bold ${colorMap[color]} uppercase tracking-wider`}>{label}</span>
                              <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">{items.length} items</span>
                            </div>
                            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            </motion.div>
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 pb-5">
                                  <div className="grid sm:grid-cols-2 gap-2">
                                    {items.map((s, i) => (
                                      <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="flex items-start gap-2.5 bg-white/4 rounded-lg px-3 py-2.5"
                                      >
                                        <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${dotMap[color]} mt-1.5`} />
                                        <p className="text-[12.5px] text-slate-300 leading-relaxed">{s}</p>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">

                  {/* Readiness Gauge + Roles side by side */}
                  <div className="grid lg:grid-cols-2 gap-5">
                    {/* Gauge */}
                    <div className="rounded-2xl border border-white/10 p-6 flex flex-col items-center text-center shadow-xl relative overflow-hidden" style={{ background: "linear-gradient(135deg, #111827 0%, #0f172a 100%)" }}>
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Hiring Index
                      </p>
                      <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="80" cy="80" r="66" stroke="#1e293b" strokeWidth="12" fill="transparent" />
                          <motion.circle
                            cx="80" cy="80" r="66"
                            stroke="url(#gaugeGrad2)" strokeWidth="12" fill="transparent"
                            strokeDasharray={2 * Math.PI * 66}
                            initial={{ strokeDashoffset: 2 * Math.PI * 66 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 66 * (1 - placementReadiness / 100) }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="gaugeGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#6366f1" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-4xl font-black text-white">{countedReadiness}%</span>
                          <span className="block text-[9px] text-slate-500 font-bold mt-0.5 uppercase tracking-widest">Ready</span>
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-400 mt-4 leading-relaxed max-w-[200px]">
                        {placementReadiness >= 80 ? "Outstanding! Profile meets high-bar hiring standards." : placementReadiness >= 60 ? "Good potential. Address SWOT weaknesses to maximize shortlisting." : "Priority updates needed. Enhance portfolio and skill diversity."}
                      </p>
                    </div>

                    {/* Role Match Bars */}
                    <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, #111827 0%, #0f172a 100%)" }}>
                      <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-[13px] font-bold text-white">Role Match Scores</h3>
                      </div>
                      <div className="p-5 space-y-4">
                        {result.recommendedRoles?.map((role, index) => (
                          <motion.div key={index} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[12.5px] font-semibold text-white">{role.title}</span>
                              <span className="text-[11px] font-black text-indigo-300">{role.match}%</span>
                            </div>
                            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: index === 0 ? 'linear-gradient(90deg, #6366f1, #10b981)' : index === 1 ? 'linear-gradient(90deg, #06b6d4, #3b82f6)' : 'linear-gradient(90deg, #8b5cf6, #ec4899)' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${role.match}%` }}
                                transition={{ duration: 1.2, delay: index * 0.15, ease: "easeOut" }}
                              />
                            </div>
                            <p className="text-[10.5px] text-slate-500 mt-1">{role.description}</p>
                          </motion.div>
                        ))}
                      </div>

                      {result.recommendedRoles?.[0] && (
                        <div className="mx-4 mb-4 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
                          <p className="text-[11px] font-black text-violet-400 flex items-center gap-1.5 mb-1.5">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI Twin Synthesis
                          </p>
                          <p className="text-[12px] text-slate-400 leading-relaxed">
                            Primary: <strong className="text-violet-300">{result.recommendedRoles[0].title}</strong><br />
                            <span className="italic opacity-80">&ldquo;{result.recommendedRoles[0].reason}&rdquo;</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phase-by-phase skill breakdown */}
                  <div className="rounded-2xl border border-white/10 overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, #111827 0%, #0f172a 100%)" }}>
                    <div className="px-6 py-4 border-b border-white/8">
                      <h3 className="text-[13px] font-bold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-400" /> Skill Mastery Progress</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Track your skill completion across each career phase</p>
                    </div>
                    <div className="p-5 space-y-5">
                      {result.timeline.map((item, phaseIdx) => {
                        const phaseKeys = item.skills.map(s => `${phaseIdx}-${s}`);
                        const checked = phaseKeys.filter(k => checkedSkills[k]).length;
                        const pct = item.skills.length > 0 ? Math.round(checked / item.skills.length * 100) : 0;
                        const phaseColor = phaseIdx === 0 ? '#6366f1' : phaseIdx === 1 ? '#06b6d4' : phaseIdx === 2 ? '#3b82f6' : '#10b981';
                        return (
                          <div key={phaseIdx} className="bg-white/4 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <span className="text-[12px] font-bold text-white">{item.title}</span>
                                <span className="text-[10px] text-slate-500 ml-2">{item.month}</span>
                              </div>
                              <span className="text-[11px] font-black" style={{ color: phaseColor }}>{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-white/8 rounded-full mb-3 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: phaseColor, width: `${pct}%` }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.4 }}
                              />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.skills.map((s, si) => {
                                const key = `${phaseIdx}-${s}`;
                                const done = !!checkedSkills[key];
                                return (
                                  <button
                                    key={si}
                                    onClick={() => toggleSkill(key)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${done ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 line-through opacity-70' : 'border-white/10 bg-white/5 text-slate-300 hover:border-indigo-500/40 hover:text-white'}`}
                                  >
                                    {done ? <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" /> : <Circle className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Reset button */}
          <div className="no-print flex justify-center mt-8 pb-4 sm:mt-12 sm:pb-10">
            <button
              onClick={() => setResult(null)}
              className="group flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-[13px] font-semibold rounded-full transition-all duration-300 hover:shadow-lg cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:rotate-180 transition-all duration-500" />
              Recalculate Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type TimelineItemProps = {
  index: number;
  month: string;
  title: string;
  subtitle: string;
  skills: string[];
  salary: string;
  active?: boolean;
  resources?: { name: string; url: string }[];
  checkedSkills?: Record<string, boolean>;
  onToggleSkill?: (key: string) => void;
};

function TimelineItem({ index, month, title, subtitle, skills, salary, active = false, resources, checkedSkills = {}, onToggleSkill }: TimelineItemProps) {
  const getTimelineIcon = (m: string, idx: number) => {
    const mLower = m.toLowerCase();
    if (mLower.includes("present") || idx === 0) return <Rocket className="w-4 h-4" />;
    if (idx === 1) return <Compass className="w-4 h-4" />;
    if (idx === 2) return <Briefcase className="w-4 h-4" />;
    return <Award className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative z-10 pl-12 sm:pl-[72px]"
    >
      <div className={`relative w-full overflow-hidden rounded-[20px] border p-4 transition-all duration-300 sm:p-6 lg:p-7 ${
          active
            ? 'border-indigo-400/35 bg-gradient-to-br from-indigo-500/[0.13] to-[#111827] shadow-[0_18px_50px_rgba(49,46,129,0.2)]'
            : 'border-white/10 bg-[#111722] shadow-[0_16px_40px_rgba(0,0,0,0.22)] hover:border-white/20'
        }`}>
          <div className={`absolute inset-y-0 left-0 w-1 ${
            month.toLowerCase().includes("present") || index === 0
              ? "bg-[#4f46e5]"
              : index === 1
                ? "bg-[#06b6d4]"
                : index === 2
                  ? "bg-[#3b82f6]"
                  : "bg-[#10b981]"
          }`} />

          <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${
                month.toLowerCase().includes("present") || index === 0
                  ? 'border-indigo-400/20 bg-indigo-500/15 text-indigo-300'
                  : index === 1
                    ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'
                    : index === 2
                      ? 'border-blue-400/20 bg-blue-500/10 text-blue-300'
                      : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
              }`}>{month}</span>

                {salary && salary !== "N/A" && salary !== "0" ? (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    {salary}
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                    Learning phase
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-400">{subtitle}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {skills.map((skill) => {
                  const skillKey = `${index}-${skill}`;
                  const done = !!checkedSkills[skillKey];
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => onToggleSkill?.(skillKey)}
                      title={done ? "Mark as not learned" : "Mark as learned"}
                      className={`flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                        done
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 line-through opacity-70"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-indigo-400/35 hover:bg-indigo-500/10 hover:text-white"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0 text-slate-600" />}
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            {resources && resources.length > 0 && (
              <div className="mt-5 border-t border-white/10 pt-5 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Learning resources</p>
                <div className="space-y-2">
                  {resources.map((resource, resourceIndex) => (
                    <a
                      key={resourceIndex}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-2 rounded-lg border border-transparent p-2 text-xs font-semibold leading-5 text-slate-400 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                    >
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                      <span>{resource.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      <div className={`absolute left-[19px] top-5 z-20 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-xl border transition-all duration-500 sm:left-[27px] sm:h-12 sm:w-12 ${
        active
          ? 'border-indigo-300/40 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_0_28px_rgba(99,102,241,0.38)]'
          : 'border-white/15 bg-[#18202e] text-slate-400'
      }`}>
        {getTimelineIcon(month, index)}
      </div>
    </motion.div>
  );
}
