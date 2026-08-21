/**
 * /dashboard/admin/metrics — Internal analytics readout
 *
 * Server component. Access is gated to the hardcoded admin allowlist.
 * Renders activation %, 7-day retention %, and 30-day retention %.
 */

import { getSessionUser } from "@/actions/auth";
import {
  getActivationRate,
  getRetentionRate,
  getPaywallCTR,
  getPricingOptionClicks,
  getWaitlistSignups,
} from "@/lib/metrics";
import { redirect } from "next/navigation";

// ─── Admin allowlist ──────────────────────────────────────────────────────────
const ADMIN_EMAILS = new Set(["harshsingh3989@gmail.com"]);

// ─── Small display components (no dependencies) ───────────────────────────────
function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #222",
        borderRadius: 12,
        padding: "24px 28px",
        minWidth: 200,
      }}
    >
      <p style={{ color: "#666", fontSize: 13, margin: "0 0 8px" }}>{label}</p>
      <p style={{ color, fontSize: 42, fontWeight: 700, margin: "0 0 6px" }}>
        {value}
      </p>
      <p style={{ color: "#555", fontSize: 12, margin: 0 }}>{sub}</p>
    </div>
  );
}

function Divider() {
  return <hr style={{ border: "none", borderTop: "1px solid #1a1a1a", margin: "32px 0" }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function MetricsPage() {
  const user = await getSessionUser();

  if (!user || !ADMIN_EMAILS.has(user.email)) {
    redirect("/dashboard");
  }

  // Fetch all metrics in parallel
  const [activation, retention7, retention30, paywallCTR, pricingClicks, waitlist] =
    await Promise.all([
      getActivationRate().catch(() => ({ total: 0, activated: 0, rate: 0 })),
      getRetentionRate(7).catch(() => ({ windowDays: 7 as const, cohortSize: 0, returned: 0, rate: 0 })),
      getRetentionRate(30).catch(() => ({ windowDays: 30 as const, cohortSize: 0, returned: 0, rate: 0 })),
      getPaywallCTR().catch(() => ({ shown: 0, clicked: 0, rate: 0 })),
      getPricingOptionClicks().catch(() => ({ monthly: 0, season_pass: 0 })),
      getWaitlistSignups().catch(() => ({ total: 0, monthly: 0, season_pass: 0 })),
    ]);

  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e5e5e5",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "48px 40px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ color: "#444", fontSize: 12, margin: "0 0 6px", letterSpacing: 2, textTransform: "uppercase" }}>
          SkillSprint · Internal
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px" }}>
          Analytics Dashboard
        </h1>
        <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
          Phase 1 — Retention &amp; Activation · as of {now} IST
        </p>
      </div>

      <Divider />

      {/* Activation */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#888", marginBottom: 20, letterSpacing: 1 }}>
          ACTIVATION
        </h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <MetricCard
            label="Activation Rate"
            value={`${activation.rate}%`}
            sub={`${activation.activated} of ${activation.total} users completed resume + GitHub`}
            color="#4ade80"
          />
          <MetricCard
            label="Total Signed Up"
            value={String(activation.total)}
            sub="users in the database"
            color="#e5e5e5"
          />
          <MetricCard
            label="Fully Activated"
            value={String(activation.activated)}
            sub="resumeUploaded AND githubIngested = true"
            color="#60a5fa"
          />
        </div>
        <p style={{ color: "#444", fontSize: 12, marginTop: 14 }}>
          Target: &gt;40% activation rate before scaling acquisition.
        </p>
      </section>

      <Divider />

      {/* Retention */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#888", marginBottom: 20, letterSpacing: 1 }}>
          RETENTION
        </h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <MetricCard
            label="7-Day Retention"
            value={`${retention7.rate}%`}
            sub={`${retention7.returned} of ${retention7.cohortSize} users returned within 7 days`}
            color={retention7.rate >= 25 ? "#4ade80" : "#f97316"}
          />
          <MetricCard
            label="30-Day Retention"
            value={`${retention30.rate}%`}
            sub={`${retention30.returned} of ${retention30.cohortSize} users returned within 30 days`}
            color={retention30.rate >= 15 ? "#4ade80" : "#f97316"}
          />
        </div>
        <p style={{ color: "#444", fontSize: 12, marginTop: 14 }}>
          Cohort = users with a <code style={{ color: "#666" }}>gap_analysis_completed</code> event at least N days ago.
          Returned = cohort members with a <code style={{ color: "#666" }}>session_start</code> in the N-day window after their first gap analysis.
        </p>
        <p style={{ color: "#444", fontSize: 12, marginTop: 6 }}>
          Targets: 7-day &gt;25% · 30-day &gt;15% (per PDF benchmarks for early PMF validation).
        </p>
      </section>

      <Divider />

      {/* Raw event counts */}
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#888", marginBottom: 12, letterSpacing: 1 }}>
          INSTRUMENTED EVENTS
        </h2>
        <table style={{ borderCollapse: "collapse", fontSize: 13, color: "#777" }}>
          <tbody>
            {[
              ["session_start", "Fires once per hour on login (cookie-guarded)"],
              ["resume_uploaded", "Fires when analyzeResume() completes successfully"],
              ["github_ingested", "Fires when analyzeGitHubProfile() completes successfully"],
              ["gap_analysis_completed", "Fires when getSkillSprintScores() persists scores"],
              ["paywall_shown", "Fires when upgrade modal is displayed to a capped user"],
              ["paywall_upgrade_clicked", "Fires when user clicks 'Join Pro Early Access'"],
              ["pricing_option_clicked", "Fires when a pricing card CTA is clicked (metadata.option)"],
              ["waitlist_signup", "Fires when user submits their email in the receipt flow"],
            ].map(([event, desc]) => (
              <tr key={event}>
                <td style={{ padding: "6px 16px 6px 0", fontFamily: "monospace", color: "#60a5fa" }}>
                  {event}
                </td>
                <td style={{ padding: "6px 0", color: "#555" }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Divider />

      {/* Paywall CTR */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#888", marginBottom: 20, letterSpacing: 1 }}>
          PAYWALL CTR — PHASE 2
        </h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <MetricCard
            label="Paywall CTR"
            value={`${paywallCTR.rate}%`}
            sub={`${paywallCTR.clicked} clicked of ${paywallCTR.shown} shown`}
            color={paywallCTR.rate >= 20 ? "#4ade80" : "#f97316"}
          />
          <MetricCard
            label="Paywall Shown"
            value={String(paywallCTR.shown)}
            sub="paywall_shown events"
            color="#e5e5e5"
          />
          <MetricCard
            label="Upgrade Clicked"
            value={String(paywallCTR.clicked)}
            sub="paywall_upgrade_clicked events"
            color="#a78bfa"
          />
        </div>
        <p style={{ color: "#444", fontSize: 12, marginTop: 14 }}>
          Target: &gt;20% CTR validates strong willingness-to-pay signal.
        </p>
      </section>

      <Divider />

      {/* Pricing option clicks */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#888", marginBottom: 20, letterSpacing: 1 }}>
          PRICING OPTION PREFERENCE
        </h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <MetricCard
            label="Pro Monthly Clicks"
            value={String(pricingClicks.monthly)}
            sub="₹199/month option selected"
            color="#a78bfa"
          />
          <MetricCard
            label="Season Pass Clicks"
            value={String(pricingClicks.season_pass)}
            sub="₹399 one-time option selected"
            color="#fbbf24"
          />
        </div>
      </section>

      <Divider />

      {/* Waitlist signups */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#888", marginBottom: 20, letterSpacing: 1 }}>
          WAITLIST SIGNUPS
        </h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <MetricCard
            label="Total Signups"
            value={String(waitlist.total)}
            sub="email addresses captured"
            color="#4ade80"
          />
          <MetricCard
            label="Monthly Plan"
            value={String(waitlist.monthly)}
            sub="chose ₹199/month"
            color="#a78bfa"
          />
          <MetricCard
            label="Season Pass"
            value={String(waitlist.season_pass)}
            sub="chose ₹399 one-time"
            color="#fbbf24"
          />
        </div>
        <p style={{ color: "#444", fontSize: 12, marginTop: 14 }}>
          Stored as <code style={{ color: "#666" }}>waitlist_signup</code> events · metadata includes email + chosen option.
        </p>
      </section>
    </div>
  );
}
