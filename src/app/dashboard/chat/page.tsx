"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, User, Copy, Check, FileDown } from "lucide-react";
import { askCareerCoach, type ChatMessage } from "@/actions/chat";
import React from "react";

// Helper to escape HTML characters
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper to parse inline Markdown into HTML string (inline styles only — no Tailwind)
function renderInlineToHTML(text: string): string {
  let escaped = escapeHTML(text);
  // Bold
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700;color:#1e293b;">$1</strong>');
  // Italic
  escaped = escaped.replace(/\*(.*?)\*/g, '<em style="font-style:italic;color:#475569;">$1</em>');
  escaped = escaped.replace(/_(.*?)_/g, '<em style="font-style:italic;color:#475569;">$1</em>');
  // Inline code
  escaped = escaped.replace(/`(.*?)`/g, '<code style="background:#f1f5f9;color:#4338ca;padding:2px 7px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:12px;border:1px solid #e2e8f0;">$1</code>');
  // Links
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#4f46e5;text-decoration:underline;font-weight:600;">$1</a>');
  return escaped;
}

// Helper to parse block Markdown into HTML string for PDF (inline styles only — no Tailwind)
function renderMarkdownToHTML(content: string): string {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).trim().split('\n');
      const language = lines[0] && !lines[0].includes(' ') ? lines[0] : '';
      const code = language ? lines.slice(1).join('\n') : lines.join('\n');
      return `
        <pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:10px;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.6;overflow-x:auto;border:1px solid #1e293b;margin:14px 0;page-break-inside:avoid;">
          ${language ? `<div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:800;border-bottom:1px solid #1e293b;padding-bottom:8px;margin-bottom:10px;">${language}</div>` : ''}
          <code>${escapeHTML(code)}</code>
        </pre>
      `;
    } else {
      const lines = part.split('\n');
      let html = '';
      let currentList: string[] = [];
      let listType: 'bullet' | 'ordered' | null = null;

      const flushList = () => {
        if (currentList.length > 0) {
          if (listType === 'bullet') {
            html += `
              <div style="border-left:3px solid #c7d2fe;padding-left:16px;margin:14px 0;">
                ${currentList.map(item => `
                  <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                    <span style="flex-shrink:0;width:8px;height:8px;border-radius:50%;background:#4f46e5;border:2px solid white;box-shadow:0 0 0 1px #4f46e5;margin-top:6px;"></span>
                    <div style="font-size:13.5px;color:#475569;line-height:1.7;font-weight:500;">${item}</div>
                  </div>
                `).join('')}
              </div>
            `;
          } else {
            html += `
              <div style="border-left:3px solid #c7d2fe;padding-left:16px;margin:14px 0;">
                ${currentList.map((item, idx) => `
                  <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                    <span style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:#ede9fe;border:1px solid #c4b5fd;color:#4f46e5;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;margin-top:3px;">${idx + 1}</span>
                    <div style="font-size:13.5px;color:#475569;line-height:1.7;font-weight:500;">${item}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }
          currentList = [];
          listType = null;
        }
      };

      lines.forEach((line) => {
        const trimmed = line.trim();
        const bulletMatch = line.match(/^(\s*)[*+-]\s+(.*)$/);
        const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

        if (bulletMatch) {
          if (listType !== 'bullet') { flushList(); listType = 'bullet'; }
          currentList.push(renderInlineToHTML(bulletMatch[2]));
        } else if (orderedMatch) {
          if (listType !== 'ordered') { flushList(); listType = 'ordered'; }
          currentList.push(renderInlineToHTML(orderedMatch[2]));
        } else {
          flushList();
          if (trimmed === '') {
            html += `<div style="height:8px;"></div>`;
          } else {
            const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
            if (headerMatch) {
              const level = headerMatch[1].length;
              const headerText = headerMatch[2];
              if (level === 1) {
                html += `<h1 style="font-size:16px;font-weight:800;color:#1e1b4b;border-left:4px solid #4f46e5;padding-left:12px;margin:24px 0 10px;page-break-after:avoid;">${renderInlineToHTML(headerText)}</h1>`;
              } else if (level === 2) {
                html += `<h2 style="font-size:14px;font-weight:800;color:#312e81;border-left:4px solid #818cf8;padding-left:12px;margin:20px 0 8px;page-break-after:avoid;">${renderInlineToHTML(headerText)}</h2>`;
              } else {
                html += `<h3 style="font-size:12.5px;font-weight:700;color:#1e293b;margin:16px 0 6px;page-break-after:avoid;">${renderInlineToHTML(headerText)}</h3>`;
              }
            } else if (trimmed.startsWith('>')) {
              html += `<div style="border-left:4px solid #c4b5fd;background:#faf5ff;padding:10px 16px;margin:12px 0;border-radius:0 8px 8px 0;font-style:italic;color:#6d28d9;font-size:13px;">${renderInlineToHTML(trimmed.slice(1).trim())}</div>`;
            } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
              html += `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">`;
            } else {
              html += `<p style="margin-bottom:10px;color:#475569;font-size:13.5px;line-height:1.75;">${renderInlineToHTML(line)}</p>`;
            }
          }
        }
      });

      flushList();
      return html;
    }
  }).join('');
}


// Function to export content to a styled printable PDF window
function exportToPDF(content: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to export as PDF");
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>SkillSprint AI Career Coach Report</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
        <style>
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          @page { size: A4; margin: 18mm; }
          @media print {
            body { padding: 0; margin: 0; }
            .no-print { display: none !important; }
            .page-break-inside-avoid { page-break-inside: avoid; }
            .page-break-after-avoid { page-break-after: avoid; }
          }
          body {
            font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
            color: #334155;
            background: #ffffff;
            max-width: 760px;
            margin: 0 auto;
            padding: 24px 32px;
          }
          pre, code {
            font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
          }
          h1 { font-size: 16px; font-weight: 800; color: #1e1b4b; border-left: 4px solid #4f46e5; padding-left: 12px; margin: 24px 0 10px; page-break-after: avoid; }
          h2 { font-size: 14px; font-weight: 800; color: #312e81; border-left: 4px solid #818cf8; padding-left: 12px; margin: 20px 0 8px; page-break-after: avoid; }
          h3 { font-size: 12.5px; font-weight: 700; color: #1e293b; margin: 16px 0 6px; page-break-after: avoid; }
          p { font-size: 13.5px; color: #475569; line-height: 1.75; margin-bottom: 10px; }
          ul, ol { padding-left: 0; margin: 12px 0; }
          li {
            font-size: 13.5px;
            color: #475569;
            line-height: 1.7;
            font-weight: 500;
            margin-bottom: 6px;
            padding-left: 20px;
            position: relative;
            list-style: none;
          }
          li::before {
            content: '';
            position: absolute;
            left: 0;
            top: 9px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #4f46e5;
            border: 2px solid white;
            box-shadow: 0 0 0 1px #4f46e5;
          }
          ol > li::before {
            content: counter(list-item);
            counter-increment: list-item;
            background: #ede9fe;
            color: #4f46e5;
            font-size: 9px;
            font-weight: 800;
            top: 4px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: none;
            border: 1px solid #c4b5fd;
          }
          ol { counter-reset: list-item; }
          pre {
            background: #0f172a;
            color: #e2e8f0;
            padding: 16px;
            border-radius: 10px;
            font-size: 11px;
            line-height: 1.6;
            overflow-x: auto;
            border: 1px solid #1e293b;
            margin: 14px 0;
            page-break-inside: avoid;
          }
          code:not(pre code) {
            background: #f1f5f9;
            color: #4338ca;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            border: 1px solid #e2e8f0;
          }
          a { color: #4f46e5; text-decoration: underline; }
          strong { font-weight: 700; color: #1e293b; }
          em { font-style: italic; color: #475569; }
          blockquote {
            border-left: 4px solid #c4b5fd;
            background: #faf5ff;
            padding: 10px 16px;
            margin: 12px 0;
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: #6d28d9;
          }
        </style>
      </head>
      <body>
        <!-- Top accent bar -->
        <div style="height:5px;background:linear-gradient(to right,#4f46e5,#6366f1,#8b5cf6);border-radius:4px;margin-bottom:24px;"></div>

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
          <div>
            <span style="font-size:8px;font-weight:900;letter-spacing:0.15em;color:#4f46e5;text-transform:uppercase;">SkillSprint Career GPS</span>
            <h1 style="margin:4px 0 0 0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;border:none;padding:0;">AI Career Intelligence Report</h1>
            <p style="margin:4px 0 0 0;font-size:11px;color:#94a3b8;font-weight:500;">Personalized guidance from your SkillSprint AI Coach</p>
          </div>
          <div style="background:#ede9fe;border:1px solid #c4b5fd;color:#4f46e5;font-weight:800;padding:6px 14px;border-radius:999px;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;">
            SkillSprint AI Export
          </div>
        </div>

        <!-- Metadata card -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div>
            <p style="margin:0 0 2px 0;font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">REPORT FOR</p>
            <p style="margin:0;font-size:11.5px;font-weight:700;color:#0f172a;">SkillSprint Student</p>
          </div>
          <div style="text-align:center;">
            <p style="margin:0 0 2px 0;font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">ISSUED BY</p>
            <p style="margin:0;font-size:11.5px;font-weight:700;color:#4f46e5;display:flex;align-items:center;justify-content:center;gap:4px;">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#4f46e5;"></span>
              SkillSprint AI Coach
            </p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0 0 2px 0;font-size:8px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">GENERATED ON</p>
            <p style="margin:0;font-size:11.5px;font-weight:700;color:#0f172a;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <!-- Divider with label -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
          <div style="flex:1;height:1px;background:linear-gradient(to right,#e2e8f0,transparent);"></div>
          <span style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;">Career Guidance</span>
          <div style="flex:1;height:1px;background:linear-gradient(to left,#e2e8f0,transparent);"></div>
        </div>

        <!-- Report Content -->
        <div style="color:#475569;line-height:1.75;">
          ${renderMarkdownToHTML(content)}
        </div>

        <!-- Footer -->
        <div style="border-top:1px solid #e2e8f0;margin-top:40px;padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
          <p style="margin:0;font-size:9px;color:#94a3b8;">© ${new Date().getFullYear()} SkillSprint. Empowering developer trajectories.</p>
          <p style="margin:0;font-size:9px;color:#cbd5e1;font-weight:600;">Confidential Guidance Document</p>
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

// Inline Copy Button Component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border border-gray-300 transition-colors text-[11px] font-semibold"
      title="Copy message"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// Inline PDF Export Button Component
function PDFButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => exportToPDF(text)}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border border-gray-300 transition-colors text-[11px] font-semibold cursor-pointer"
      title="Export as PDF"
    >
      <FileDown className="w-3.5 h-3.5" />
      <span>Export PDF</span>
    </button>
  );
}


// Inline Markdown Parser Component
function Markdown({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const language = lines[0] && !lines[0].includes(' ') ? lines[0] : '';
          const code = language ? lines.slice(1).join('\n') : lines.join('\n');
          return (
            <pre key={index} className="bg-[#1e1e2e] text-[#cdd6f4] p-4 rounded-xl my-3 font-mono text-[12.5px] overflow-x-auto border border-gray-800/60 shadow-inner leading-relaxed">
              {language && (
                <div className="text-[10px] text-[#6c7086] uppercase tracking-wider mb-2.5 font-bold border-b border-gray-700/50 pb-1.5">
                  {language}
                </div>
              )}
              <code>{code}</code>
            </pre>
          );
        } else {
          const lines = part.split('\n');
          const elements: React.ReactNode[] = [];
          let currentList: React.ReactNode[] = [];
          let listType: 'bullet' | 'ordered' | null = null;

          const flushList = (key: number) => {
            if (currentList.length > 0) {
              if (listType === 'bullet') {
                elements.push(
                  <ul key={`list-${key}`} className="my-3 space-y-1.5 pl-0">
                    {currentList}
                  </ul>
                );
              } else {
                elements.push(
                  <ol key={`list-${key}`} className="my-3 space-y-1.5 pl-0 counter-reset-list">
                    {currentList}
                  </ol>
                );
              }
              currentList = [];
              listType = null;
            }
          };

          lines.forEach((line, lineIndex) => {
            const trimmed = line.trim();
            const bulletMatch = line.match(/^(\s*)[*+-]\s+(.*)$/);
            const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

            if (bulletMatch) {
              if (listType !== 'bullet') { flushList(lineIndex); listType = 'bullet'; }
              currentList.push(
                <li key={lineIndex} className="flex items-start gap-2.5 text-[14px] text-gray-700 leading-relaxed">
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 mt-[7px]" />
                  <span>{renderInline(bulletMatch[2])}</span>
                </li>
              );
            } else if (orderedMatch) {
              if (listType !== 'ordered') { flushList(lineIndex); listType = 'ordered'; }
              const num = currentList.length + 1;
              currentList.push(
                <li key={lineIndex} className="flex items-start gap-2.5 text-[14px] text-gray-700 leading-relaxed">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center mt-0.5">{num}</span>
                  <span>{renderInline(orderedMatch[2])}</span>
                </li>
              );
            } else {
              flushList(lineIndex);
              if (trimmed === '') {
                elements.push(<div key={lineIndex} className="h-2" />);
              } else {
                const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
                if (headerMatch) {
                  const level = headerMatch[1].length;
                  const headerText = headerMatch[2];
                  if (level === 1) {
                    elements.push(<h1 key={lineIndex} className="text-[17px] font-bold text-gray-900 mt-5 mb-2 leading-snug">{renderInline(headerText)}</h1>);
                  } else if (level === 2) {
                    elements.push(<h2 key={lineIndex} className="text-[15px] font-bold text-gray-900 mt-4 mb-2 leading-snug">{renderInline(headerText)}</h2>);
                  } else {
                    elements.push(<h3 key={lineIndex} className="text-[13.5px] font-semibold text-gray-900 mt-3 mb-1.5">{renderInline(headerText)}</h3>);
                  }
                } else if (trimmed.startsWith('>')) {
                  elements.push(
                    <div key={lineIndex} className="border-l-[3px] border-gray-300 pl-3 my-2 text-gray-500 italic text-[13.5px]">
                      {renderInline(trimmed.slice(1).trim())}
                    </div>
                  );
                } else if (trimmed === '---' || trimmed === '***') {
                  elements.push(<hr key={lineIndex} className="border-gray-200 my-3" />);
                } else {
                  elements.push(
                    <p key={lineIndex} className="text-[14px] text-gray-700 leading-[1.75] mb-2">
                      {renderInline(line)}
                    </p>
                  );
                }
              }
            }
          });

          flushList(lines.length);
          return <React.Fragment key={index}>{elements}</React.Fragment>;
        }
      })}
    </>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_|`.*?`|\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    } else if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={index} className="italic text-gray-700">{part.slice(1, -1)}</em>;
    } else if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="bg-gray-100 text-[#c7254e] px-1.5 py-0.5 rounded-md font-mono text-[12px] border border-gray-200">{part.slice(1, -1)}</code>;
    } else if (part.startsWith('[') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        return <a key={index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-[#1a56db] hover:underline font-medium">{match[1]}</a>;
      }
    }
    return part;
  });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your **SkillSprint AI Career Coach**. I've analyzed your resume, GitHub metrics, and career trajectory.\n\nAsk me anything — from optimizing your profile to passing technical interviews and landing your target role!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

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
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Apologies, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const suggestions = [
    "Am I placement ready?",
    "What should I learn next?",
    "Which jobs suit me?",
    "Build project ideas for me",
    "How to improve recruiter visibility?",
  ];

  return (
    <>
      {/* Remove dashboard background animation for this page */}
      <div className="fixed inset-0 bg-white z-[1] pointer-events-none" />

      <div className="fixed inset-0 z-[2] flex pt-16 md:pt-0" style={{ paddingLeft: "var(--sidebar-width, 0px)" }}>
        {/* Full-height Claude-style chat panel */}
        <div className="flex-1 flex flex-col bg-white min-h-0 md:pl-[240px]">

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-gray-900 leading-none">SkillSprint AI Career Coach</h1>
                <p className="text-[11px] text-gray-400 mt-0.5">Powered by Gemini Pro</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] text-gray-400 font-medium">Online</span>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

              {messages.map((m, index) => {
                const isBot = m.role === "assistant";
                return (
                  <div key={index} className={`flex gap-4 ${isBot ? "" : "flex-row-reverse"}`}>
                    {/* Avatar */}
                    {isBot ? (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm mt-0.5">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center mt-0.5">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`group flex flex-col gap-2 max-w-[85%] ${isBot ? "" : "items-end"}`}>
                      {isBot ? (
                        <>
                          <div className="text-[14px] leading-[1.8] text-gray-800 font-normal">
                            <Markdown content={m.content} />
                          </div>
                          {/* Action bar below assistant message */}
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <CopyButton text={m.content} />
                            <PDFButton text={m.content} />
                          </div>
                        </>
                      ) : (
                        <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl rounded-tr-sm text-[14px] leading-relaxed font-normal whitespace-pre-line max-w-lg">
                          {m.content}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading */}
              {loading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm mt-0.5">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 pl-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "160ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "320ms" }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Bottom input area */}
          <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 pb-4 pt-3">
            <div className="max-w-3xl mx-auto">

              {/* Suggestion chips — only show when no user messages sent yet */}
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {suggestions.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(text)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-[12.5px] font-medium text-white border border-gray-700 transition-colors cursor-pointer disabled:opacity-40 shadow-sm"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}

              {/* Input box */}
              <div className="relative flex items-end bg-white border border-gray-400 rounded-2xl shadow-sm hover:border-gray-600 focus-within:border-gray-800 focus-within:shadow-md transition-all">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  disabled={loading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message AI Career Coach..."
                  className="flex-1 resize-none bg-transparent px-4 py-3.5 text-[14px] text-gray-900 placeholder-gray-400 outline-none leading-relaxed max-h-40 overflow-y-auto"
                  style={{ minHeight: "52px" }}
                />
                <div className="flex items-center gap-1.5 pr-3 pb-2.5 flex-shrink-0">
                  <span className="text-[11px] text-gray-500 font-semibold hidden sm:block">Enter ↵</span>
                  <button
                    type="button"
                    disabled={!input.trim() || loading}
                    onClick={() => handleSendMessage(input)}
                    className="w-8 h-8 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-200 text-white rounded-lg flex items-center justify-center transition-colors disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-2">
                AI Career Coach can make mistakes. Verify important career advice independently.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
