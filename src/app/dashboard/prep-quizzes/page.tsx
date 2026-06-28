"use client";

import { useState } from "react";
import { 
  ClipboardCheck, 
  ArrowRight, 
  CheckCircle, 
  HelpCircle, 
  AlertCircle, 
  Download, 
  ChevronRight, 
  Award,
  RefreshCw,
  Zap,
  BookOpen,
  Calendar,
  Lock
} from "lucide-react";
import Link from "next/link";

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Which hashing algorithm is currently recommended for cryptographically secure password storage?",
    options: ["MD5", "SHA-1", "Argon2 / bcrypt", "DES"],
    correct: 2,
    explanation: "Argon2 and bcrypt are slow, resource-intensive hashing algorithms specifically designed to resist brute-force and hardware-accelerated attacks."
  },
  {
    id: 2,
    text: "What is the primary security benefit of utilizing HTTPS instead of standard HTTP?",
    options: ["Enables server-side compression", "Encrypts communication channel to prevent sniffing", "Automatically caches static assets", "Allows cross-origin scripting"],
    correct: 1,
    explanation: "HTTPS establishes an encrypted SSL/TLS tunnel between the browser and server, protecting transmitted payloads from man-in-the-middle interception."
  },
  {
    id: 3,
    text: "Which statement accurately describes asymmetric (public-key) cryptography?",
    options: ["A single private key is shared between sender and recipient", "The public key decrypts files while the private key compresses them", "Two mathematically linked keys (public and private) are used", "It relies entirely on symmetric block cipher operations"],
    correct: 2,
    explanation: "Asymmetric cryptography utilizes a key pair: public key for encryption (shared openly) and private key for decryption (kept secret)."
  },
  {
    id: 4,
    text: "What is the primary objective of the HTTP Strict-Transport-Security (HSTS) response header?",
    options: ["Forces browsers to connect strictly over HTTPS", "Restricts cross-origin resource access", "Configures XSS filter settings", "Blocks iframe embedding"],
    correct: 0,
    explanation: "HSTS instructs the browser to automatically upgrade all future connection attempts to HTTPS, preventing downgrade attacks."
  },
  {
    id: 5,
    text: "Which vulnerability pattern allows a malicious script to be executed in the context of a user's browser session?",
    options: ["SQL Injection", "Cross-Site Scripting (XSS)", "CSRF Token Bypass", "Insecure Direct Object Reference"],
    correct: 1,
    explanation: "Cross-Site Scripting (XSS) occurs when malicious, unescaped scripts are injected into trusted web applications and executed in the client browser."
  },
  {
    id: 6,
    text: "What security mechanism protects against Cross-Site Request Forgery (CSRF)?",
    options: ["MIME Sniffing Headers", "Secure Hash Salting", "Anti-CSRF Tokens validated on state-changing requests", "Asymmetric Key Handshake"],
    correct: 2,
    explanation: "CSRF protection requires unique, cryptographically random tokens bound to the user session that are verified on any POST/PUT/DELETE request."
  },
  {
    id: 7,
    text: "In token-based JWT authentication, which client-side storage mechanism offers the best protection against XSS access?",
    options: ["Standard LocalStorage", "SessionStorage", "HttpOnly Cookie with Secure & SameSite attributes", "In-memory global state"],
    correct: 2,
    explanation: "Cookies marked with the HttpOnly flag cannot be accessed via JavaScript APIs, preventing malicious XSS scripts from reading the token payload."
  },
  {
    id: 8,
    text: "What is the purpose of adding a random 'salt' payload to password hashes?",
    options: ["Reduces the hash computation time", "Prevents dictionary and rainbow table pre-computation attacks", "Enables decryption of the original password", "Limits CPU core utilization during validation"],
    correct: 1,
    explanation: "Salting ensures identical passwords yield different hashes, rendering pre-computed dictionary tables (rainbow tables) useless."
  },
  {
    id: 9,
    text: "Which directive in a Content-Security-Policy (CSP) header is used to control executable script origins?",
    options: ["frame-ancestors", "style-src", "script-src", "connect-src"],
    correct: 2,
    explanation: "The `script-src` directive specifies approved sources for JavaScript execution, mitigating the risk of malicious script injection."
  },
  {
    id: 10,
    text: "What does the 'S' stand for in HTTPS?",
    options: ["Secure", "Socket", "System", "Standard"],
    correct: 0,
    explanation: "HTTPS stands for Hypertext Transfer Protocol Secure, indicating the session is layered over a cryptographically secured connection."
  }
];

export default function PrepQuizzesPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [activeTab, setActiveTab] = useState<"strengths" | "recommendations" | "advice">("strengths");

  const score = Object.entries(answers).reduce((acc, [qIdx, ansIdx]) => {
    return acc + (QUESTIONS[Number(qIdx)].correct === ansIdx ? 10 : 0);
  }, 0);

  const handleSelectOption = (idx: number) => {
    setSelectedAnswer(idx);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;
    
    const newAnswers = { ...answers, [currentQuestion]: selectedAnswer };
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers({});
    setQuizFinished(false);
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prep Quizzes Assessment Report</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
              color: #1e293b;
              padding: 40px;
              line-height: 1.5;
            }
            .header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
            }
            .subtitle {
              font-size: 14px;
              color: #64748b;
              margin-top: 5px;
            }
            .score-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 30px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .score-val {
              font-size: 32px;
              font-weight: 900;
              color: #4f46e5;
            }
            .section-title {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin: 30px 0 15px;
              border-left: 4px solid #4f46e5;
              padding-left: 10px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 15px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 15px;
              background: #ffffff;
            }
            .strength-badge {
              display: inline-block;
              padding: 5px 10px;
              background: #ecfdf5;
              color: #065f46;
              border-radius: 6px;
              font-weight: 700;
              font-size: 12px;
              margin-right: 8px;
              margin-bottom: 8px;
            }
            .timeline-item {
              margin-bottom: 15px;
              padding-left: 15px;
              border-left: 2px solid #6366f1;
            }
            .timeline-week {
              font-size: 12px;
              font-weight: 800;
              color: #4f46e5;
              text-transform: uppercase;
            }
            .timeline-title {
              font-weight: 700;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">SkillSprint AI Prep Quiz</h1>
            <p class="subtitle">SDE & Web Security Assessment Report • Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="score-card">
            <div>
              <div style="font-size: 14px; color: #64748b; font-weight: 600;">Overall Score</div>
              <div style="font-size: 13px; color: #4f46e5; font-weight: bold; margin-top: 2px;">Placement Ready</div>
            </div>
            <div class="score-val">${score}/100</div>
          </div>

          <h2 class="section-title">Verified Strengths</h2>
          <div style="margin-bottom: 20px;">
            <span class="strength-badge">✓ Cryptography</span>
            <span class="strength-badge">✓ Self Awareness</span>
            <span class="strength-badge">✓ Career Planning</span>
            <span class="strength-badge">✓ Secure Protocols</span>
            <span class="strength-badge">✓ Web Security</span>
          </div>

          <h2 class="section-title">Identified Gaps & Weaknesses</h2>
          <div class="card" style="border-left: 4px solid #f59e0b; background: #fffdfa;">
            <strong style="color: #b45309;">Continue building depth</strong>
            <p style="margin: 5px 0 0; font-size: 13px; color: #64748b;">Consolidate advanced deployment architectures and asymmetric handshake handshakes.</p>
          </div>

          <h2 class="section-title">Remediation Timeline</h2>
          <div class="card">
            <div class="timeline-item">
              <div class="timeline-week">Week 1-2 • 2 Weeks</div>
              <div class="timeline-title">Strengthen core concepts</div>
              <div style="font-size: 12px; color: #64748b;">General CS fundamentals, secure memory management, and caching layouts.</div>
            </div>
            <div class="timeline-item">
              <div class="timeline-week">Week 3-4 • 2 Weeks</div>
              <div class="timeline-title">Apply knowledge in projects</div>
              <div style="font-size: 12px; color: #64748b;">Build a personal project, contribute to open source repositories, and push secure endpoints.</div>
            </div>
            <div class="timeline-item flex-none">
              <div class="timeline-week">Week 5-6 • 2 Weeks</div>
              <div class="timeline-title">Mock interviews & refinement</div>
              <div style="font-size: 12px; color: #64748b;">Practice behavioral questions, master system design basics, and secure deployment pipelines.</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
              <ClipboardCheck className="h-6 w-6 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-white flex items-center gap-3">
                Prep Quizzes
              </h1>
              <p className="text-slate-300 mt-1.5 text-sm font-medium">
                SDE & Web Security Assessment: Test your knowledge and generate custom remediation roadmaps.
              </p>
            </div>
          </div>
          {quizFinished && (
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Assessment Report</span>
            </button>
          )}
        </div>
      </div>

      {!quizFinished ? (
        /* Quiz Interface */
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 rounded-3xl border border-white bg-white/60 backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* Progress */}
            <div className="flex justify-between items-center text-xs font-bold text-gray-500">
              <span>QUESTION {currentQuestion + 1} OF {QUESTIONS.length}</span>
              <span className="bg-indigo-50 text-[#4f46e5] px-2.5 py-1 rounded-lg">Web Security</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            {/* Question Text */}
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 leading-snug">
              {QUESTIONS[currentQuestion].text}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {QUESTIONS[currentQuestion].options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-inner font-bold text-indigo-700' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold border transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                          : 'bg-gray-50 border-gray-200 text-gray-400 group-hover:border-gray-300'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-[13.5px] leading-relaxed font-medium">{opt}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'translate-x-1 text-indigo-600' : 'group-hover:translate-x-0.5'}`} />
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                disabled={selectedAnswer === null}
                onClick={handleNext}
                className="flex items-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs px-6 py-3 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{currentQuestion === QUESTIONS.length - 1 ? "Finish Assessment" : "Next Question"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="rounded-3xl border border-white bg-white/60 backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              Unlock Remediation
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Complete this quick 10-question SDE and security assessment to analyze your strengths, target gaps, and generate your customized 6-week remediation timeline.
            </p>
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-slate-700">10 High-Signal Questions</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-slate-700">Detailed Explanations & Resource Mapping</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-slate-700">PDF Report Export</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Results and Remediation View matching layout in image */
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Content Area: Tabs & Views */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tabs Header */}
            <div className="flex border-b border-gray-200 gap-6 bg-white/40 p-2 rounded-2xl border border-white shadow-sm">
              <button
                onClick={() => setActiveTab("strengths")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === "strengths"
                    ? "bg-[#0f172a] text-white shadow-md"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Strengths & Gaps
              </button>
              <button
                onClick={() => setActiveTab("recommendations")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === "recommendations"
                    ? "bg-[#0f172a] text-white shadow-md"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Recommendations
              </button>
              <button
                onClick={() => setActiveTab("advice")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === "advice"
                    ? "bg-[#0f172a] text-white shadow-md"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Career Advice
              </button>
            </div>

            {/* Tab Views */}
            <div className="rounded-3xl border border-white bg-white/60 backdrop-blur-md shadow-sm p-6 sm:p-8 min-h-[400px] flex flex-col justify-between">
              
              {activeTab === "strengths" && (
                <div className="space-y-8">
                  {/* Verified Strengths block */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                      Verified Strengths
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        "Cryptography",
                        "Self Awareness",
                        "Career Planning",
                        "Secure Protocols",
                        "Web Security"
                      ].map((st, i) => (
                        <div key={i} className="flex items-center gap-2 p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-800">{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Identified Gaps block */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                      Identified Gaps & Weaknesses
                    </h3>
                    <div className="flex items-start gap-3 p-4 bg-amber-50/40 border border-amber-100 rounded-2xl">
                      <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Continue building depth</span>
                        <span className="text-[11px] text-gray-500 mt-1 block leading-relaxed font-semibold">
                          Consolidate advanced deployment architectures, secure JWT session management, and microservice proxy patterns.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Actions block */}
                  <div className="space-y-2.5 pt-4 border-t border-gray-150">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400">Immediate Actions Needed</h4>
                    <p className="text-xs text-gray-500 font-semibold">• No critical gaps identified</p>
                  </div>
                </div>
              )}

              {activeTab === "recommendations" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-2">Recommended Study Paths</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                      Based on your quiz score of **{score}/100**, we suggest reviewing these key domains:
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-white/80 border border-gray-150 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Advanced Asymmetric Handshakes</span>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">Security</span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Deep dive into TLS 1.3 protocol handshakes, cipher negotiation, and session key derivation.
                      </p>
                    </div>

                    <div className="p-4 bg-white/80 border border-gray-150 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Secure JWT Storage</span>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">Architecture</span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Review cookie storage, Cross-Site Scripting (XSS) payload blocking, and token revocation paradigms.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "advice" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 mb-2">AI Career Alignment</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                      Your solid understanding of cryptography and secure protocols indicates a strong fit for these trajectories:
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/80 border border-gray-150 rounded-2xl space-y-1">
                      <span className="text-xs font-black text-indigo-600 block">Security Engineer</span>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Leading deployment audits, defining microservice policies, and configuring identity gateways.
                      </p>
                    </div>
                    <div className="p-4 bg-white/80 border border-gray-150 rounded-2xl space-y-1">
                      <span className="text-xs font-black text-indigo-600 block">SecOps Specialist</span>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        Automating threat modeling, managing secret values, and validating continuous integration security scans.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-6 border-t border-gray-100 mt-8">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block leading-none">Assessment Score</span>
                    <span className="text-sm font-extrabold text-slate-800 mt-1 block">{score}/100</span>
                  </div>
                </div>
                <button
                  onClick={handleRestart}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-bold bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restart Quiz</span>
                </button>
              </div>

            </div>
          </div>

          {/* Remediation Timeline Sidebar matching image */}
          <div className="rounded-3xl border border-white bg-white/60 backdrop-blur-md shadow-sm p-6 sm:p-8 space-y-6">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-indigo-500" />
              Remediation Timeline
            </h3>
            
            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-indigo-150">
              
              {/* Week 1-2 */}
              <div className="flex gap-4 relative">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white border-4 border-white shadow-sm flex-shrink-0 flex items-center justify-center z-10" />
                <div className="space-y-1">
                  <span className="text-[9px] font-black tracking-wider text-indigo-600 uppercase block">WEEK 1-2 • 2 WEEKS</span>
                  <span className="text-xs font-bold text-slate-800 block">Strengthen core concepts</span>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    <span className="text-[9px] px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-full font-bold">General CS fundamentals</span>
                  </div>
                </div>
              </div>

              {/* Week 3-4 */}
              <div className="flex gap-4 relative">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white border-4 border-white shadow-sm flex-shrink-0 flex items-center justify-center z-10" />
                <div className="space-y-1">
                  <span className="text-[9px] font-black tracking-wider text-indigo-600 uppercase block">WEEK 3-4 • 2 WEEKS</span>
                  <span className="text-xs font-bold text-slate-800 block">Apply knowledge in projects</span>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    <span className="text-[9px] px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-full font-bold">Build a personal project</span>
                    <span className="text-[9px] px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-full font-bold">Contribute to open source</span>
                  </div>
                </div>
              </div>

              {/* Week 5-6 */}
              <div className="flex gap-4 relative">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white border-4 border-white shadow-sm flex-shrink-0 flex items-center justify-center z-10" />
                <div className="space-y-1">
                  <span className="text-[9px] font-black tracking-wider text-indigo-600 uppercase block">WEEK 5-6 • 2 WEEKS</span>
                  <span className="text-xs font-bold text-slate-800 block">Mock interviews & refinement</span>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    <span className="text-[9px] px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-full font-bold">Practice behavioral questions</span>
                    <span className="text-[9px] px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-full font-bold">System design basics</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
