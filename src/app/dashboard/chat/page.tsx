"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, HelpCircle, Loader2 } from "lucide-react";
import { askCareerCoach, type ChatMessage } from "@/actions/chat";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I am your SkillSprint AI Career Coach. I have analyzed your resume, GitHub metrics, and career twin trajectory. Ask me anything about how to optimize your profile, pass technical interviews, or land your target job!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMessage];
      const responseText = await askCareerCoach(history);
      setMessages(prev => [...prev, { role: "assistant", content: responseText }]);
    } catch (err) {
      console.error("Chat failure", err);
      setMessages(prev => [...prev, { role: "assistant", content: "Apologies, I encountered an error connecting to my core brain. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Am I placement ready?",
    "What should I learn next?",
    "Which jobs suit me?",
    "Which projects should I build?",
    "How can I improve my recruiter visibility?"
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] w-full">
      {/* Header */}
      <div>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-[#4f46e5] animate-pulse" /> AI Career Coach
        </h1>
        <p className="text-gray-600 mt-2 text-[15px]">Personalized guidance tailored to your SkillSprint profile metrics.</p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 min-h-0 flex flex-col liquid-glass rounded-3xl overflow-hidden border border-white/50 shadow-lg">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, index) => {
            const isBot = m.role === "assistant";
            return (
              <div 
                key={index} 
                className={`flex gap-4 max-w-[85%] ${isBot ? "self-start" : "self-end flex-row-reverse ml-auto"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isBot ? "bg-[#4f46e5] text-white" : "bg-gray-900 text-white"}`}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl text-[14px] leading-relaxed font-medium shadow-sm ${
                  isBot 
                    ? "bg-white/95 text-gray-800 rounded-tl-none border border-gray-100" 
                    : "bg-gray-900 text-white rounded-tr-none"
                }`}>
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-4 max-w-[85%] self-start">
              <div className="w-8 h-8 rounded-full bg-[#4f46e5] text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl text-[14px] bg-white/95 text-gray-500 rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#4f46e5]" />
                <span>Coach is thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-6 py-3 bg-white/20 border-t border-white/40 flex flex-wrap gap-2">
          {suggestions.map((text, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(text)}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/60 hover:bg-white text-[12px] font-medium text-gray-700 border border-gray-200/50 transition-colors shadow-sm hover:shadow"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#4f46e5]" />
              <span>{text}</span>
            </button>
          ))}
        </div>

        {/* Input area */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="p-4 bg-white/90 border-t border-gray-200/50 flex gap-3 items-center"
        >
          <input
            type="text"
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question here (e.g., 'How do I optimize my projects?')..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-[14px] text-gray-900 outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-transparent transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
