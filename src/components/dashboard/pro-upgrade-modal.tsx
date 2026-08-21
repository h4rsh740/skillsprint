"use client";

import { useEffect } from "react";
import { X, Zap, Star, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { clientTrack } from "@/lib/client-track";

interface ProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Which feature triggered the paywall */
  feature?: string;
  /** Current user id for event tracking */
  userId?: string;
}

export function ProUpgradeModal({
  open,
  onClose,
  feature = "mock_interviews",
  userId,
}: ProUpgradeModalProps) {
  // Fire paywall_shown once when the modal opens
  useEffect(() => {
    if (!open) return;
    clientTrack("paywall_shown", { feature }).catch(() => {});
  }, [open, feature, userId]);

  function handleUpgradeClick() {
    clientTrack("paywall_upgrade_clicked", { feature }).catch(() => {});
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal card */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="relative overflow-hidden px-8 pb-6 pt-8">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-purple-900/20 to-transparent" />
              <div className="relative">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1">
                  <Zap size={12} className="text-violet-400" />
                  <span className="text-xs font-medium text-violet-300">
                    Pro Feature
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  You&apos;ve used all 3 free interviews
                </h2>
                <p className="mt-2 text-sm text-white/50">
                  Upgrade to Pro for unlimited mock interviews, advanced
                  feedback, and career twin intelligence.
                </p>
              </div>
            </div>

            {/* Feature list */}
            <div className="px-8 pb-6">
              <ul className="space-y-3">
                {[
                  { icon: Zap, text: "Unlimited mock interviews" },
                  { icon: Star, text: "Advanced AI feedback & scoring" },
                  { icon: Clock, text: "Interview history & trends" },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-violet-500/15">
                      <Icon size={14} className="text-violet-400" />
                    </span>
                    <span className="text-sm text-white/70">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="px-8 pb-8">
              <button
                id="paywall-upgrade-btn"
                onClick={handleUpgradeClick}
                className="w-full rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500 active:scale-[0.98]"
              >
                Join Pro Early Access →
              </button>
              <p className="mt-3 text-center text-xs text-white/30">
                No payment today · Waitlist signup only
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
