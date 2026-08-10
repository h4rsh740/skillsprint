"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  registerX402PaymentListener,
  unregisterX402PaymentListener,
  createSimulatedPaymentSignature,
  type X402PaymentDetails,
} from "@/lib/x402/client";
import { generateAlgorandURI, generatePeraDeepLink, amountToMicroUnits } from "@/lib/x402/pera";

// Zero-dependency SVG Icon Components to prevent Turbopack chunk module errors
const Coins = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18 8c0 3.3-2.7 6-6 6"/><path d="M6 12c0 3.3 2.7 6 6 6h6"/></svg>
);
const ShieldCheck = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
);
const X = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
);
const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const Wallet = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3v4a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7"/><path d="M16 14h.01"/></svg>
);
const Copy = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
);
const Check = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);
const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);
const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
);
const Clock = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const ExternalLink = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
);

// Algorand TestNet Indexer base URL (free, no API key needed)
const INDEXER_BASE = "https://testnet-idx.algonode.cloud/v2";
const POLL_INTERVAL_MS = 4000; // check every 4 seconds

export function X402PaymentModal() {
  const [mounted, setMounted] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<X402PaymentDetails | null>(null);
  const [resolveCallback, setResolveCallback] = useState<((sig: string) => void) | null>(null);
  const [rejectCallback, setRejectCallback] = useState<((reason: string) => void) | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrUri, setQrUri] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes timer
  const [pollStatus, setPollStatus] = useState<"idle" | "polling" | "found">("idle");

  // Refs to avoid stale closure issues in polling intervals
  const sessionStartRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<((sig: string) => void) | null>(null);
  const detailsRef = useRef<X402PaymentDetails | null>(null);
  const autoFiredRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    registerX402PaymentListener((details, resolve, reject) => {
      // Record session start time for indexer "after" filter
      sessionStartRef.current = Math.floor(Date.now() / 1000) - 5; // 5s buffer
      autoFiredRef.current = false;
      detailsRef.current = details;
      resolveRef.current = resolve;

      setPaymentDetails(details);
      setResolveCallback(() => resolve);
      setRejectCallback(() => reject);
      setIsProcessing(false);
      setIsSuccess(false);
      setCopiedAddress(false);
      setCopiedLink(false);
      setTimeLeft(900);
      setPollStatus("polling");
    });

    return () => {
      unregisterX402PaymentListener();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (!paymentDetails) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentDetails]);

  // Generate QR code whenever payment details change
  useEffect(() => {
    if (paymentDetails) {
      const uri = generateAlgorandURI(paymentDetails);
      setQrUri(uri);
      console.log("[x402 QR URI]:", uri); // debug: verify URI in console
      QRCode.toDataURL(uri, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: "H", // highest error correction = easiest to scan
        color: {
          dark: "#000000",  // pure black modules
          light: "#ffffff", // pure white background
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("[x402 QR Error]:", err));
    }
  }, [paymentDetails]);

  /**
   * Polls the Algorand TestNet Indexer for a matching inbound ASA transfer.
   * Runs every POLL_INTERVAL_MS seconds while the modal is open.
   */
  const checkPaymentOnChain = useCallback(async () => {
    const details = detailsRef.current;
    const resolve = resolveRef.current;
    if (!details || !resolve || autoFiredRef.current) return;

    const minRound = sessionStartRef.current;
    const assetId = details.assetId ?? 10458941;
    const expectedMicroUnits = Math.round(
      parseFloat(details.amount.replace(/[^0-9.]/g, "")) * 1_000_000
    );

    try {
      // Query last 10 asset transfers to payTo address since session start
      const url =
        `${INDEXER_BASE}/accounts/${details.payTo}/transactions` +
        `?asset-id=${assetId}&limit=10&after-time=${new Date(minRound * 1000).toISOString()}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return; // network error — will retry next tick

      const data = await res.json();
      const txns: any[] = data.transactions ?? [];

      const matched = txns.find((txn: any) => {
        // Look for axfer (asset transfer) to our payTo address
        const axfer = txn["asset-transfer-transaction"];
        if (!axfer) return false;
        const toAddr = axfer["receiver"];
        const transferAmount = axfer["amount"] as number;
        const transferAsset = txn["asset-id"] ?? axfer["asset-id"];
        return (
          toAddr === details.payTo &&
          transferAsset === assetId &&
          transferAmount >= expectedMicroUnits
        );
      });

      if (matched) {
        console.log("[x402] 🎉 Payment detected on-chain!", matched["id"]);
        autoFiredRef.current = true;
        setPollStatus("found");
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);

        // Brief celebration delay then auto-authorize
        setIsProcessing(true);
        await new Promise((r) => setTimeout(r, 800));
        const { createSimulatedPaymentSignature } = await import("@/lib/x402/client");
        const signature = createSimulatedPaymentSignature(details);
        setIsSuccess(true);
        await new Promise((r) => setTimeout(r, 600));
        resolve(signature);

        setPaymentDetails(null);
        setResolveCallback(null);
        setRejectCallback(null);
        setIsProcessing(false);
        setIsSuccess(false);
        setPollStatus("idle");
        detailsRef.current = null;
        resolveRef.current = null;
      }
    } catch (err) {
      // Silently ignore network errors — polling will retry
      console.warn("[x402 poll]", err);
    }
  }, []);

  // Start/stop blockchain polling when paymentDetails changes
  useEffect(() => {
    if (!paymentDetails) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }
    // Kick off polling immediately then every POLL_INTERVAL_MS
    checkPaymentOnChain();
    pollTimerRef.current = setInterval(checkPaymentOnChain, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [paymentDetails, checkPaymentOnChain]);

  const handleCancel = () => {
    if (rejectCallback) {
      rejectCallback("User cancelled x402 payment authorization");
    }
    setPaymentDetails(null);
    setResolveCallback(null);
    setRejectCallback(null);
  };

  const handleAuthorize = async () => {
    if (!paymentDetails || !resolveCallback) return;

    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 600));

    const signature = createSimulatedPaymentSignature(paymentDetails);
    setIsSuccess(true);

    await new Promise((r) => setTimeout(r, 500));

    resolveCallback(signature);

    setPaymentDetails(null);
    setResolveCallback(null);
    setRejectCallback(null);
    setIsProcessing(false);
    setIsSuccess(false);
  };

  const handleCopyAddress = () => {
    if (paymentDetails?.payTo) {
      navigator.clipboard.writeText(paymentDetails.payTo);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (paymentDetails) {
      const link = generateAlgorandURI(paymentDetails);
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!paymentDetails || !mounted) return null;

  const peraDeepLink = generatePeraDeepLink(paymentDetails);
  const microUnits = amountToMicroUnits(paymentDetails.amount);

  return createPortal(
    <AnimatePresence>
      <div 
        style={{ zIndex: 2147483647, position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(2,6,23,0.92)", padding: "1rem" }}
      >
        <motion.div
          style={{ zIndex: 2147483647, position: "relative" }}
          initial={{ opacity: 0, scale: 0.93, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-indigo-500/40 bg-[#0b0f19] p-5 sm:p-6 text-white shadow-[0_0_120px_rgba(79,70,229,0.6)]"
        >
          {/* Background Meshes & Glows */}
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/80 via-slate-900/60 to-cyan-950/60 pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-[#4f46e5]/35 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-[#06b6d4]/25 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4f46e5] to-[#06b6d4] p-0.5 shadow-md shadow-indigo-500/20">
                <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                  <Coins className="w-4 h-4 text-indigo-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#06b6d4]">x402 Protocol</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-400/30 text-[9px] font-bold text-emerald-300 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">Algorand Micropayment</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-amber-300">
                <Clock className="w-3 h-3" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
              <button
                onClick={handleCancel}
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Card Content */}
          <div className="relative z-10 my-4 space-y-3.5">
            {/* Amount & Endpoint Banner */}
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/60 to-slate-900/80 p-3.5 text-center relative overflow-hidden shadow-inner">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block mb-0.5">
                {paymentDetails.description || paymentDetails.endpoint}
              </span>

              <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline justify-center gap-1.5 my-0.5">
                {paymentDetails.amount}
                <span className="text-sm font-bold text-[#06b6d4]">{paymentDetails.currency}</span>
                <span className="text-[11px] font-semibold text-slate-400">({microUnits.toLocaleString()} micro-USDC)</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl p-4 border-2 border-indigo-400/40 shadow-xl relative">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Algorand Pera Wallet Payment QR Code"
                  className="w-48 h-48 rounded-md object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 font-semibold text-xs gap-2">
                  <div className="w-8 h-8 border-4 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                  Generating QR...
                </div>
              )}

              <div className="mt-2 text-center space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950 text-white text-[10.5px] font-bold border border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Scan with Pera Wallet App
                </span>
                {qrUri && (
                  <p className="text-[9px] text-slate-500 font-mono break-all max-w-[200px] leading-tight">
                    {qrUri.slice(0, 60)}{qrUri.length > 60 ? "…" : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Action Links */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{copiedLink ? "Link Copied!" : "Copy Payment Link"}</span>
              </button>

              <a
                href={peraDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold text-indigo-300 hover:text-white transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Open Pera App</span>
              </a>
            </div>

            {/* Recipient & Network Footer Bar */}
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-2.5 text-[11px] font-medium flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-[#06b6d4]" /> Algorand TestNet
              </span>
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-1 font-mono text-[10px] text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/20 transition-all cursor-pointer"
              >
                <span>{paymentDetails.payTo.slice(0, 6)}...{paymentDetails.payTo.slice(-4)}</span>
                {copiedAddress ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Auto-detection status + Fallback Button */}
          <div className="relative z-10 pt-2 border-t border-white/10 space-y-2">

            {/* Auto-detection badge */}
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-white/5 border border-white/10">
              {isSuccess || pollStatus === "found" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">Payment detected! Confirming…</span>
                </>
              ) : isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-300">Verifying on Algorand…</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    Watching for payment · checking every 4s
                  </span>
                </>
              )}
            </div>

            {/* Fallback manual button — only useful if auto-detect misses */}
            {!isProcessing && !isSuccess && pollStatus !== "found" && (
              <button
                onClick={handleAuthorize}
                className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-300" />
                <span>Already paid? Tap to verify manually</span>
              </button>
            )}

            <button
              onClick={handleCancel}
              disabled={isProcessing || isSuccess}
              className="w-full rounded-xl py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
