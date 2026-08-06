// Real resume text extraction.
//
// Supports PDF, DOCX and plain text. Returns the extracted text and a flag
// indicating whether any text was found. PDFs that are image-only / scanned
// will yield empty text — callers must handle that honestly (no fake data).

import fs from "fs";
import os from "os";
import path from "path";

export type ExtractResult = {
  text: string;
  isEmpty: boolean; // true when no usable text could be extracted
  reason?: string; // why extraction failed / was empty (for UI errors)
};

// Best-effort cleanup of extracted text: collapse excessive blank lines,
// trim, and strip obvious PDF control artifacts.
function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, " ") // null bytes from PDFs
    .replace(/[ \t]+\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l, i, arr) => l.length > 0 || (arr[i - 1] && arr[i - 1].length > 0))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksLikeRealText(text: string): boolean {
  // Heuristic: require alphabetic content and a minimum length.
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  return letters >= 40 && text.length >= 80;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Use unpdf — a serverless-friendly PDF text extractor built for Next.js/Vercel.
  // It bundles its own PDF.js and works without any native dependencies.
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text || "";
  } catch (err: any) {
    throw new Error(`PDF extraction failed: ${err?.message || "unknown error"}`);
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  // Use runtime-only import to bypass Turbopack/webpack static analysis.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const mammoth: any = await new Function('return import("mammoth")')();
  const mod = mammoth.default ?? mammoth;
  const result = await mod.extractRawText({ buffer });
  return result?.value || "";
}

export async function extractResumeText(file: File): Promise<ExtractResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const name = file.name || "";
  const lowerName = name.toLowerCase();

  try {
    if (lowerName.endsWith(".txt") || (file.type || "").includes("text/plain")) {
      const text = buffer.toString("utf8");
      const cleaned = cleanText(text);
      return { text: cleaned, isEmpty: !looksLikeRealText(cleaned) };
    }

    if (lowerName.endsWith(".pdf") || (file.type || "").includes("pdf")) {
      const text = await extractPdf(buffer);
      const cleaned = cleanText(text);
      if (!looksLikeRealText(cleaned)) {
        return {
          text: "",
          isEmpty: true,
          reason:
            "No text could be extracted from this PDF. It may be a scanned/image-only document. Please upload a text-based PDF or a .txt/.docx file.",
        };
      }
      return { text: cleaned, isEmpty: false };
    }

    if (lowerName.endsWith(".docx") || (file.type || "").includes("word")) {
      const text = await extractDocx(buffer);
      const cleaned = cleanText(text);
      if (!looksLikeRealText(cleaned)) {
        return { text: "", isEmpty: true, reason: "No text could be extracted from this DOCX file." };
      }
      return { text: cleaned, isEmpty: false };
    }

    // Unknown type: best-effort treat as UTF-8 text.
    const text = buffer.toString("utf8");
    const cleaned = cleanText(text);
    if (!looksLikeRealText(cleaned)) {
      return {
        text: "",
        isEmpty: true,
        reason: "Unsupported file type. Please upload a PDF, DOCX or TXT resume.",
      };
    }
    return { text: cleaned, isEmpty: false };
  } catch (err: any) {
    return {
      text: "",
      isEmpty: true,
      reason: `Failed to parse resume file: ${err?.message || "unknown error"}. Try a text-based PDF, DOCX or TXT.`,
    };
  }
}

// Helper used by server routes that receive a raw Buffer + filename
// (e.g. when not going through the browser File API).
export async function extractResumeTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ExtractResult> {
  try {
    if (fileName.toLowerCase().endsWith(".pdf") || (mimeType || "").includes("pdf")) {
      const text = await extractPdf(buffer);
      const cleaned = cleanText(text);
      return { text: cleaned, isEmpty: !looksLikeRealText(cleaned) };
    }
    if (fileName.toLowerCase().endsWith(".docx") || (mimeType || "").includes("word")) {
      const text = await extractDocx(buffer);
      const cleaned = cleanText(text);
      return { text: cleaned, isEmpty: !looksLikeRealText(cleaned) };
    }
    const text = buffer.toString("utf8");
    const cleaned = cleanText(text);
    return { text: cleaned, isEmpty: !looksLikeRealText(cleaned) };
  } catch (err: any) {
    return { text: "", isEmpty: true, reason: err?.message || "extraction failed" };
  }
}

// Re-export for backwards compatibility with any code that needs a temp path.
export function writeToTemp(buffer: Buffer, ext: string): string {
  const tmp = path.join(os.tmpdir(), `skillsprint-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  fs.writeFileSync(tmp, buffer);
  return tmp;
}
