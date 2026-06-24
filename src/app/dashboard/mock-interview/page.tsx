"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Settings, Play, ArrowRight, RefreshCw, Loader2, Award, CheckCircle2, MessageSquare, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import { getConversationTurn, evaluateConversation, type InterviewQuestion, type InterviewEvaluation } from "@/actions/interview";

type InterviewState = "settings" | "loading_questions" | "questioning" | "submitting" | "results";

export default function MockInterviewPage() {
  const [state, setState] = useState<InterviewState>("settings");
  
  // Settings
  const [interviewType, setInterviewType] = useState("Technical (Frontend)");
  const [targetCompany, setTargetCompany] = useState("Google");
  const [difficulty, setDifficulty] = useState("SDE-1 (Entry Level)");

  // Conversational History & Progress
  const [history, setHistory] = useState<{ role: "interviewer" | "candidate"; content: string }[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isLoadingTurn, setIsLoadingTurn] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);

  // Voice/Text Toggle & Synthesis States
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Refs for tracking active listeners, transitions, and modes to prevent stale closures
  const isListeningRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const isVoiceInputActiveRef = useRef(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const setListeningState = (val: boolean) => {
    setIsListening(val);
    isListeningRef.current = val;
  };

  const setVoiceInputActiveState = (val: boolean) => {
    setIsVoiceInputActive(val);
    isVoiceInputActiveRef.current = val;
  };

  // Auto-scroll chat window
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, isLoadingTurn]);

  // Initialize SpeechRecognition on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          const transcript = (finalTranscript + interimTranscript).trim().toLowerCase();
          
          if (transcript) {
            console.log("Real-time speech check:", transcript);

            // 1. Quit Interview command (analyzed immediately from interim/final transcript)
            if (/\b(quit|exit|quit interview|exit interview|quit session|exit session)\b/.test(transcript)) {
              setState("settings");
              return;
            }

            // 2. Repeat Question command (analyzed immediately)
            if (/\b(repeat|say again|repeat question)\b/.test(transcript)) {
              speakLastInterviewerTurn();
              return;
            }

            // 3. Skip Question command (analyzed immediately)
            if (/\b(skip|skip question|pass question)\b/.test(transcript)) {
              setCurrentAnswer("Candidate chose to skip this question.");
              setTimeout(() => {
                const submitBtn = document.getElementById("submit-turn-btn");
                if (submitBtn) submitBtn.click();
              }, 100);
              return;
            }

            // 4. Submit Answer command (analyzed immediately)
            if (/\b(submit|submit answer|next|next question|done|finished)\b/.test(transcript)) {
              setTimeout(() => {
                const submitBtn = document.getElementById("submit-turn-btn");
                if (submitBtn) submitBtn.click();
              }, 100);
              return;
            }
          }

          // Accumulate clean final text to prevent input field pollution
          if (finalTranscript) {
            const cleanText = finalTranscript.trim().toLowerCase().replace(/[\.\?,!]+$/, "").trim();
            // Block command words from polluting the written response
            if (/\b(quit|exit|repeat|say again|skip|pass|submit|done|next|finished)\b/.test(cleanText)) {
              return;
            }
            setCurrentAnswer((prev) => prev + finalTranscript + " ");
          }
        };

        rec.onerror = (event: any) => {
          console.warn("Speech recognition error", event.error);
          setListeningState(false);
          
          if (event.error === "network") {
            setSpeechError("Network error: Chrome voice transcription requires an internet connection. Fallback to typing.");
            setVoiceInputActiveState(false); // Fallback to typing
          } else if (event.error === "not-allowed") {
            setSpeechError("Microphone permission denied. Fallback to typing.");
            setVoiceInputActiveState(false); // Fallback to typing
          } else if (event.error === "no-speech") {
            // Ignored as it is a common harmless timeout
          } else {
            setSpeechError(`Voice input error (${event.error}). Fallback to typing.`);
            setVoiceInputActiveState(false); // Fallback to typing
          }
        };

        rec.onend = () => {
          setListeningState(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome, Apple Safari, or Microsoft Edge.");
      return;
    }

    if (isListeningRef.current) {
      recognition.stop();
      setListeningState(false);
    } else {
      setSpeechError(null);
      try {
        recognition.start();
        setListeningState(true);
      } catch (err) {
        console.warn("Failed to start speech recognition", err);
      }
    }
  };

  const speakQuestion = (text: string, onSpeechFinished?: () => void) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      
      utterance.onend = () => {
        setIsAiSpeaking(false);
        if (isTransitioningRef.current) {
          return;
        }
        if (onSpeechFinished) {
          onSpeechFinished();
        }
      };

      utterance.onerror = () => {
        setIsAiSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const speakLastInterviewerTurn = () => {
    const lastInterviewerMsg = [...history].reverse().find(h => h.role === "interviewer");
    if (lastInterviewerMsg) {
      isTransitioningRef.current = false;
      speakQuestion(lastInterviewerMsg.content, () => {
        if (recognition && !isListeningRef.current && !isTransitioningRef.current && isVoiceInputActiveRef.current) {
          setSpeechError(null);
          try {
            recognition.start();
            setListeningState(true);
          } catch (err) {
            console.warn("Auto mic trigger failed:", err);
          }
        }
      });
    }
  };

  // Cancel speech when leaving questioning state
  useEffect(() => {
    if (state !== "questioning") {
      isTransitioningRef.current = true;
      setIsAiSpeaking(false);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (isListeningRef.current && recognition) {
        recognition.stop();
        setListeningState(false);
      }
    }
  }, [state]);

  const handleStartInterview = async () => {
    setState("loading_questions");
    isTransitioningRef.current = true;
    try {
      const startTurn = await getConversationTurn([], { type: interviewType, company: targetCompany, difficulty });
      setHistory([{ role: "interviewer", content: startTurn.interviewerResponse }]);
      setAnswers([]);
      setTurnIndex(0);
      setCurrentAnswer("");
      setSpeechError(null);
      setState("questioning");

      isTransitioningRef.current = false;
      // Speak the first question
      if (!isMuted) {
        speakQuestion(startTurn.interviewerResponse, () => {
          if (recognition && !isListeningRef.current && !isTransitioningRef.current && isVoiceInputActiveRef.current) {
            try {
              recognition.start();
              setListeningState(true);
            } catch (err) {
              console.warn("Auto mic trigger failed:", err);
            }
          }
        });
      }
    } catch (err) {
      console.warn(err);
      setState("settings");
    }
  };

  const handleNextTurn = async () => {
    if (!currentAnswer.trim() || isLoadingTurn) return;

    // Block any speech callbacks from executing start() in the background
    isTransitioningRef.current = true;

    // Stop listening / speaking immediately
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (isListeningRef.current && recognition) {
      recognition.stop();
      setListeningState(false);
    }

    const updatedHistory = [
      ...history,
      { role: "candidate" as const, content: currentAnswer }
    ];
    setHistory(updatedHistory);
    
    // Add answer to local recap list
    setAnswers(prev => [...prev, { question: history[history.length - 1].content, answer: currentAnswer }]);

    if (turnIndex >= 2) {
      // Evaluate entire conversation
      setState("submitting");
      try {
        const result = await evaluateConversation(updatedHistory);
        setEvaluation(result);
        setState("results");
      } catch (err) {
        console.warn("Evaluation failed", err);
        setState("settings");
      }
    } else {
      setIsLoadingTurn(true);
      try {
        const nextTurn = await getConversationTurn(updatedHistory, { type: interviewType, company: targetCompany, difficulty });
        
        if (nextTurn.isFinished) {
          setState("submitting");
          const result = await evaluateConversation([...updatedHistory, { role: "interviewer", content: nextTurn.interviewerResponse }]);
          setEvaluation(result);
          setState("results");
        } else {
          setHistory(prev => [...prev, { role: "interviewer", content: nextTurn.interviewerResponse }]);
          setTurnIndex(prev => prev + 1);
          setCurrentAnswer("");
          setSpeechError(null);
          setIsLoadingTurn(false);
          
          isTransitioningRef.current = false;
          // Speak the next question
          if (!isMuted) {
            speakQuestion(nextTurn.interviewerResponse, () => {
              if (recognition && !isListeningRef.current && !isTransitioningRef.current && isVoiceInputActiveRef.current) {
                try {
                  recognition.start();
                  setListeningState(true);
                } catch (err) {
                  console.warn("Auto mic trigger failed:", err);
                }
              }
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch next turn", err);
        setIsLoadingTurn(false);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-lg relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-purple-950/25 to-slate-900/10 opacity-70 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner flex-shrink-0">
            <Mic className="h-6 w-6 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight tracking-tight text-white flex items-center gap-3">
              AI Mock Interview Agent
            </h1>
            <p className="text-slate-300 mt-1.5 text-[14.5px] font-medium">
              Practice real-time interactive technical & HR interviews scored by Gemini.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state === "settings" && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-2 liquid-glass rounded-3xl min-h-[280px] md:min-h-[400px] flex flex-col items-center justify-center p-6 sm:p-8 text-center border-2 border-dashed border-gray-300">
              <div className="w-24 h-24 rounded-full bg-[#4f46e5]/10 flex items-center justify-center mb-6 shadow-[0_0_0_8px_rgba(79,70,229,0.05)]">
                <Mic className="h-10 w-10 text-[#4f46e5]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Ready for your interview?</h3>
              <p className="text-gray-500 mt-2 mb-6 sm:mb-8 text-sm max-w-sm">Ensure your microphone is connected. The interviewer will start speaking first.</p>
              
              <button 
                onClick={handleStartInterview}
                className="group flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[15px] font-medium rounded-full pl-6 pr-2 py-2.5 transition-colors shadow-sm"
              >
                <div className="h-[20px] overflow-hidden relative">
                  <div className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                    <span className="h-[20px] flex items-center">Start Interview</span>
                    <span className="h-[20px] flex items-center">Start Interview</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-[#4f46e5] ml-0.5" />
                </div>
              </button>
            </div>

            <div className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6 h-fit">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
                <Settings className="w-5 h-5 text-gray-900" />
                <h3 className="font-semibold text-gray-900">Interview Settings</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-medium text-gray-700 block mb-1.5">Interview Type</label>
                  <select 
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
                  >
                    <option>Technical (Frontend)</option>
                    <option>Technical (Backend)</option>
                    <option>System Design</option>
                    <option>Behavioral / HR</option>
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-gray-700 block mb-1.5">Target Company</label>
                  <select 
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
                  >
                    <option>Google</option>
                    <option>Microsoft</option>
                    <option>Amazon</option>
                    <option>Stripe</option>
                    <option>General Tier-1</option>
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-gray-700 block mb-1.5">Difficulty</label>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-white/60 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
                  >
                    <option>SDE-1 (Entry Level)</option>
                    <option>Internship</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {state === "loading_questions" && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass rounded-3xl min-h-[280px] md:min-h-[400px] flex flex-col items-center justify-center p-6 sm:p-8 text-center max-w-3xl mx-auto"
          >
            <Loader2 className="w-12 h-12 text-[#4f46e5] animate-spin mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Customizing Interview</h3>
            <p className="text-gray-500 mt-2">Gemini is connecting you with an interviewer. Ready your voice...</p>
          </motion.div>
        )}

        {state === "questioning" && (
          <motion.div 
            key="questioning"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="liquid-glass rounded-3xl p-4 sm:p-6 md:p-8 max-w-3xl mx-auto border border-gray-200 space-y-4 sm:space-y-6"
          >
            {/* Status indicator */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-150">
              <span className="text-xs font-bold text-indigo-650 uppercase tracking-widest">
                Real-Time Conversation (Question {turnIndex + 1} of 3)
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-250 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse">
                Live Session
              </span>
            </div>

            {/* Conversation Bubbles */}
            <div 
              className="space-y-4 max-h-[300px] overflow-y-auto pr-2 pb-4 scroll-smooth min-h-[120px]" 
              ref={chatContainerRef}
            >
              {history.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'interviewer' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-4 text-[14px] leading-relaxed shadow-sm ${
                    msg.role === 'interviewer' 
                      ? 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tl-none' 
                      : 'bg-[#4f46e5] text-white rounded-tr-none'
                  }`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                      {msg.role === 'interviewer' ? 'AI Interviewer' : 'You (Candidate)'}
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoadingTurn && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-indigo-50 border border-indigo-100 text-slate-500 rounded-2xl rounded-tl-none p-4 text-[13px] flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI Interviewer is evaluating and thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Voice-First Interface Panel vs Standard Text fallback */}
            {isVoiceInputActive ? (
              <div className="space-y-6 pt-4 border-t border-gray-150 animate-in fade-in duration-300">
                {/* Glowing Avatar Ripples */}
                <div className="flex flex-col items-center justify-center py-6 relative">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Speaks & Listen Visual pings */}
                    {isAiSpeaking && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping [animation-duration:1.5s]" />
                        <div className="absolute inset-2 rounded-full bg-indigo-500/10 animate-ping [animation-duration:2s]" />
                      </>
                    )}
                    {isListening && !isAiSpeaking && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping [animation-duration:1.5s]" />
                        <div className="absolute inset-2 rounded-full bg-emerald-500/10 animate-ping [animation-duration:2s]" />
                      </>
                    )}

                    {/* Inner circle */}
                    <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 shadow-md transition-all duration-500 ${
                      isAiSpeaking 
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                        : isListening 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                        : isLoadingTurn 
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-white border-gray-250 text-gray-500'
                    }`}>
                      {isLoadingTurn ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Mic className={`w-8 h-8 ${isListening ? 'animate-pulse' : ''}`} />
                      )}
                      <span className="text-[9px] font-bold uppercase tracking-wider mt-1.5">
                        {isAiSpeaking ? 'Speaking' : isListening ? 'Listening' : isLoadingTurn ? 'Thinking' : 'Standby'}
                      </span>
                    </div>
                  </div>

                  <div className="text-center mt-5">
                    <h3 className="font-bold text-slate-800 text-[14.5px]">
                      {isAiSpeaking ? 'AI Interviewer is speaking...' : isListening ? 'Mic Active: Answer by Voice now' : isLoadingTurn ? 'Evaluating...' : 'Voice Mode Standby'}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">
                      Speak your response clearly. Conclude by saying <strong className="text-indigo-650">"Submit"</strong> or <strong className="text-indigo-650">"Done"</strong> to proceed.
                    </p>
                  </div>
                </div>

                {/* Live speech preview */}
                <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 max-w-md mx-auto text-center min-h-[56px] flex flex-col justify-center">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5">Live Transcription Preview</div>
                  <p className="text-[12.5px] text-slate-800 font-medium italic">
                    {currentAnswer ? `"${currentAnswer}"` : 'Listening for your response...'}
                  </p>
                </div>

                {/* Voice Commands Guidelines */}
                <div className="bg-white/40 border border-gray-200 rounded-2xl p-4 space-y-2 max-w-sm mx-auto text-left">
                  <h4 className="text-[10px] font-bold text-indigo-750 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>🗣️ Spoken Voice Commands</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-gray-650 font-medium">
                    <div>Say <strong className="text-gray-900">"Submit" / "Done"</strong></div>
                    <div className="text-gray-500">to save & proceed</div>
                    <div>Say <strong className="text-gray-900">"Skip" / "Pass"</strong></div>
                    <div className="text-gray-500">to skip question</div>
                    <div>Say <strong className="text-gray-900">"Repeat"</strong></div>
                    <div className="text-gray-500">to repeat question</div>
                    <div>Say <strong className="text-gray-900">"Quit"</strong></div>
                    <div className="text-gray-500">to exit interview</div>
                  </div>
                </div>
              </div>
            ) : (
              // Fallback Text Input (If User is Mute/Speech disabled)
              <div className="space-y-2 pt-4 border-t border-gray-150 animate-in fade-in duration-300">
                <label className="text-[13px] font-semibold text-gray-650">Your Response (Text Fallback)</label>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  disabled={isLoadingTurn}
                  rows={4}
                  placeholder="Type your response here..."
                  className="w-full bg-white border border-gray-250/70 rounded-2xl p-4 text-[14.5px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-transparent transition-all placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />

                {/* Word count & errors */}
                <div className="flex justify-between items-start text-[11px] font-medium pt-1">
                  <div className="flex-1 mr-4">
                    {speechError && (
                      <div className="flex items-center gap-1 text-red-650 font-semibold animate-in fade-in duration-200">
                        <span>⚠️ {speechError}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-gray-450 whitespace-nowrap">
                    {currentAnswer.trim().split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>
              </div>
            )}

            {/* Hidden DOM button that gets triggered by voice commands */}
            <button
              id="submit-turn-btn"
              onClick={handleNextTurn}
              className="hidden"
              aria-hidden="true"
            />

            {/* Footer Control Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-150">
              <button 
                onClick={() => setState("settings")}
                className="text-[13px] text-gray-500 hover:text-gray-700 font-semibold transition-colors"
              >
                Quit Interview
              </button>

              {/* Mode Toggles Panel */}
              <div className="flex flex-wrap gap-2.5 justify-center">
                {/* Speaker Toggle */}
                <button
                  onClick={() => {
                    if (!isMuted) {
                      window.speechSynthesis.cancel();
                    } else {
                      speakLastInterviewerTurn();
                    }
                    setIsMuted(!isMuted);
                  }}
                  className={`px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1 transition-colors ${
                    isMuted 
                      ? 'bg-red-50 border-red-200 text-red-650 hover:bg-red-100/70' 
                      : 'bg-indigo-50 border-indigo-150 text-indigo-755 hover:bg-indigo-100/75'
                  }`}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isMuted ? "Sound Off" : "Sound On"}</span>
                </button>

                {/* Text/Voice Mode switch */}
                <button
                  onClick={() => {
                    if (isVoiceInputActiveRef.current) {
                      if (isListeningRef.current && recognition) {
                        recognition.stop();
                      }
                      setListeningState(false);
                    } else {
                      if (recognition && !isListeningRef.current) {
                        setSpeechError(null);
                        try {
                          recognition.start();
                          setListeningState(true);
                        } catch (err) {}
                      }
                    }
                    setVoiceInputActiveState(!isVoiceInputActiveRef.current);
                  }}
                  className="px-3.5 py-1.5 bg-white border border-gray-250 hover:bg-gray-50 text-gray-700 text-[11px] font-bold rounded-full shadow-sm flex items-center gap-1 transition-colors"
                >
                  {isVoiceInputActive ? (
                    <>
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-650" />
                      <span>Switch to Typing</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Switch to Speaking</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Show Submit button only when Typing mode is active */}
              {!isVoiceInputActive ? (
                <button 
                  onClick={handleNextTurn}
                  disabled={!currentAnswer.trim() || isLoadingTurn}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[13.5px] font-semibold rounded-full px-6 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm animate-in fade-in duration-200"
                >
                  <span>{turnIndex >= 2 ? "Finish & Evaluate" : "Submit Answer"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-full sm:w-auto text-[11px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200/50 rounded-full px-4 py-1.5 animate-pulse text-center">
                  🎤 Voice mode active: speak your answer
                </div>
              )}
            </div>
          </motion.div>
        )}

        {state === "submitting" && (
          <motion.div 
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass rounded-3xl min-h-[280px] md:min-h-[400px] flex flex-col items-center justify-center p-6 sm:p-8 text-center max-w-3xl mx-auto"
          >
            <Loader2 className="w-12 h-12 text-[#4f46e5] animate-spin mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Evaluating Conversation</h3>
            <p className="text-gray-500 mt-2">Gemini is grading your technical accuracy and conversational flow...</p>
          </motion.div>
        )}

        {state === "results" && evaluation && (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Score cards grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="liquid-glass-light p-5 rounded-2xl flex flex-col justify-between">
                <h3 className="text-[12.5px] text-gray-500 font-semibold uppercase tracking-wider">Overall Score</h3>
                <div className="text-4xl font-extrabold text-[#4f46e5] mt-3">{evaluation.overallScore}<span className="text-sm font-normal text-gray-400">/100</span></div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-[#4f46e5] rounded-full" style={{ width: `${evaluation.overallScore}%` }} />
                </div>
              </div>
              <div className="liquid-glass-light p-5 rounded-2xl flex flex-col justify-between">
                <h3 className="text-[12.5px] text-gray-500 font-semibold uppercase tracking-wider">Technical Accuracy</h3>
                <div className="text-4xl font-extrabold text-slate-800 mt-3">{evaluation.technicalScore}<span className="text-sm font-normal text-gray-400">/100</span></div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${evaluation.technicalScore}%` }} />
                </div>
              </div>
              <div className="liquid-glass-light p-5 rounded-2xl flex flex-col justify-between">
                <h3 className="text-[12.5px] text-gray-500 font-semibold uppercase tracking-wider">Communication</h3>
                <div className="text-4xl font-extrabold text-slate-800 mt-3">{evaluation.communicationScore}<span className="text-sm font-normal text-gray-400">/100</span></div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${evaluation.communicationScore}%` }} />
                </div>
              </div>
              <div className="liquid-glass-light p-5 rounded-2xl flex flex-col justify-between">
                <h3 className="text-[12.5px] text-gray-500 font-semibold uppercase tracking-wider">Confidence</h3>
                <div className="text-4xl font-extrabold text-slate-800 mt-3">{evaluation.confidenceScore}<span className="text-sm font-normal text-gray-400">/100</span></div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${evaluation.confidenceScore}%` }} />
                </div>
              </div>
            </div>

            {/* Performance breakdown & recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
              {/* Recommendations list */}
              <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
                  <Award className="w-5 h-5 text-indigo-650" />
                  <h3 className="font-bold text-gray-900 text-lg">AI Feedback & Next Steps</h3>
                </div>
                
                <div className="space-y-4">
                  {evaluation.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/40 border border-gray-200 shadow-sm">
                      <div className="w-7 h-7 shrink-0 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-xs">
                        ✓
                      </div>
                      <div className="flex-1">
                        <p className="text-[13.5px] text-gray-700 leading-relaxed font-semibold">
                          {suggestion}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => setState("settings")}
                    className="flex-1 flex justify-center items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[14px] font-semibold rounded-full py-3.5 transition-colors shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Another Interview</span>
                  </button>
                </div>
              </div>

              {/* Recap of user answers */}
              <div className="liquid-glass-light rounded-3xl p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                  <MessageSquare className="w-4.5 h-4.5 text-gray-500" />
                  <h3 className="font-semibold text-gray-800 text-[15px]">Transcript Summary</h3>
                </div>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                  {answers.map((ans, idx) => (
                    <div key={idx} className="space-y-2 border-b border-gray-150 pb-3 last:border-0 last:pb-0">
                      <p className="text-xs font-bold text-indigo-650 uppercase">Turn {idx + 1}</p>
                      <p className="text-[12.5px] text-gray-800 font-medium line-clamp-3">"Q: {ans.question}"</p>
                      <p className="text-[12px] text-gray-500 italic bg-white/60 p-2.5 rounded-lg border border-gray-200/50">"Your Answer: {ans.answer}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
