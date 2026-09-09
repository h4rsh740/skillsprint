# SkillSprint AI — 9.5 Upgrade Summary

## 1. Executive Summary

This upgrade transformed SkillSprint AI from an application containing disconnected career features into an **evidence-driven AI Career Twin platform**.

Prior to this upgrade, scores were opaque (partly hardcoded constants such as 55/78), AI fallbacks returned silent static data without provenance indicators, progress history was templated, and genuine GitHub and interview signals dead-ended in raw database columns rather than updating candidate skill readiness.

Every change in this upgrade followed the **Inspect → Implement → Test → Verify** cycle, preserving existing working components, introducing zero breaking database schema changes, maintaining TypeScript strictness, adding 17 automated tests, and passing complete production builds.

---

## 2. What Changed & Why

| Component | Prior State | Upgraded State | Rationale |
|---|---|---|---|
| **Evidence Representation** | No shared evidence structure; raw GitHub/Resume JSON stored separately | Unified `CandidateEvidenceGraph` in `src/lib/evidence/` with 5 classifications (`DIRECT`, `INFERRED`, `WEAK`, `MISSING`, `CONFLICTING`) | Provides multi-source corroboration and answers: *"What evidence supports this skill?"* |
| **Role Intelligence** | Job matching existed only for job cards on `/dashboard/jobs` | Reusable `TargetRoleProfile` & `RoleReadinessAnalysis` in `src/lib/role-intelligence/` | Evaluates candidate against target role expectations (seniority, required vs preferred skills, experience) |
| **Readiness Scoring** | Hardcoded binary conditionals (e.g., 55 vs 78 for frontend, 75 vs 50 for portfolio) | Deterministic `ExplainableReadiness` in `src/lib/readiness/` | Explains *why* a score is 72/100, showing exact contributing factors, strengths, and weaknesses |
| **AI Claim Validation** | AI could hallucinate ungrounded claims in SWOT & projections | Anti-hallucination `validateClaim` & `validateTwinSWOT` in `src/lib/validation/` | Rejects or downgrades claims lacking candidate evidence with clear user-facing notices |
| **Action Engine** | Generic project lists with static impact percentages | Deterministic `HighestImpactAction` engine in `src/lib/action-engine/` prioritizing critical gaps | Directs candidate to the single highest-value action with concrete completion criteria |
| **Adaptive Roadmap** | Static hardcoded missing skills `["Advanced TypeScript", "Next.js", ...]` | Evidence-aware roadmap in `src/actions/roadmap.ts` derived from active role gaps | Tasks target actual evidence deficits and update adaptively when evidence changes |
| **Command Center** | Standard dashboard overview | Dynamic Command Center hero with Next Best Action & Explainable Readiness breakdown | Answers: Who am I? Where do I stand? What am I missing? What should I do next? |
| **AI Fallback Transparency** | Silent return of `simulatedPayload` | Added `_source: "LIVE_AI"` vs `_source: "SIMULATED_FALLBACK"` and `_isFallback: boolean` tags | Compliance with Wapsi Transparency Standard |
| **Test Suite** | No test runner configured in `package.json` | Comprehensive test suite running on `node:test` via `npm test` with 17 passing tests | Guarantees testability, type safety, and zero regression |

---

## 3. Core Pipelines Traced

### 3.1 Candidate Evidence Graph
```
Resume PDF / Upload → Structurer & ATS Engine ────┐
GitHub REST API     → Repos, Languages, CI/CD ───┼─→ CandidateEvidenceGraph
Mock Interview      → Technical & Verbal Scores ─┤   (Direct, Inferred, Weak,
Portfolio Audit     → Performance & SEO Scores ──┤    Missing, Conflicting)
User Profile        → Target Role & Goals ───────┘
```

### 3.2 Explainable Readiness Calculation
Every readiness score is computed deterministically:
1. **Technical Skills** (25%): Mean score of verified direct and inferred skills.
2. **Project Evidence** (20%): Volume and quality of shipped codebases, active CI/CD, and repository health.
3. **Resume Strength** (20%): ATS alignment score from parsed resume.
4. **Target Role Alignment** (20%): Percentage of required role requirements satisfied with evidence.
5. **Interview Readiness** (15%): Technical and communication performance in mock interviews.

If an integration has not been linked (e.g., no mock interview completed yet), it is marked `MISSING_DATA` with 0 contribution, and active factor weights normalize proportionally so no fake points are invented.

### 3.3 AI Claim Ground Truth Verification
When AI generates career projections, SWOT, or skill endorsements:
1. Skills and companies mentioned are extracted and normalized against canonical dictionaries.
2. The validator compares them against the candidate's verified evidence graph.
3. Claims lacking supporting code or bullet points are **REJECTED** or **DOWNGRADED**:
   - *AI Claim*: "Candidate has production Kubernetes experience."
   - *Validator*: No Kubernetes code in GitHub or experience bullets.
   - *Result*: Stripped from strengths; displayed as: *"Kubernetes experience could not be verified from repository or resume evidence."*

---

## 4. Test & Benchmark Verification

### 4.1 Automated Test Suite (`npm test`)
All 17 automated tests pass consistently:
- `tests/evidence.test.ts` (7 tests): Normalization, empty evidence handling, multi-source corroboration, framework inference, weak claim detection, missing skill tracking, conflicting evidence.
- `tests/role-intelligence.test.ts` (2 tests): Requirement extraction from unstructured job descriptions, accurate classification of MATCHED, PARTIAL, MISSING, and WEAK_EVIDENCE.
- `tests/readiness.test.ts` (2 tests): Explainable score calculation without arbitrary constants, dynamic weight normalization for missing dimensions.
- `tests/validation.test.ts` (4 tests): Unsupported claim rejection, grounded claim verification, unverified claim downgrading, Career Twin SWOT sanitization.
- `tests/action-engine.test.ts` (2 tests): P0 critical next best action prioritization, adaptive rescan loop verification.

### 4.2 Benchmark Evaluation (`scripts/benchmark/run_benchmark.ts`)
- **ATS Resume Scoring Pipeline**: Evaluated 8 diverse held-out resumes.
  - Mean baseline: 62.6 / 100
  - Mean enhanced: 70.6 / 100
  - Mean improvement: +8.0 pts
- **Roadmap Generation Pipeline**: Evaluated 6 job profiles (Google, Razorpay, Stripe, Amazon, Uber, Microsoft) with 100% success rate (12 tasks / roadmap).
- **Career Twin Projection Pipeline**: Evaluated 4 student profiles with 100% live call success rate.

---

## 5. Security & Reliability Hardening

1. **Server-Side Secret Isolation**: All Gemini, OpenRouter, and Firebase API keys remain strictly server-side in server actions and API routes.
2. **User Data Isolation**: Database queries strictly filter records by `user.id` obtained from validated session cookies.
3. **Graceful Fallback Provenance**: AI calls utilize structured JSON schemas with automatic fallback from Gemini models to OpenRouter, with explicit `_source: "LIVE_AI"` vs `_source: "SIMULATED_FALLBACK"` tags.
4. **Strict TypeScript & Build Reliability**: `npx tsc --noEmit` and `npm run build` succeed with zero errors.

---

## 6. Known Limitations & Future Enhancements

1. **LinkedIn Profile Sync**: LinkedIn OAuth and analysis models exist in the database, but live automated profile scraping is restricted by LinkedIn's API terms. Current LinkedIn scoring reflects headline and OAuth connection status.
2. **Multi-File Code Ingestion**: Codebase evidence analysis currently inspects repository languages, file counts, workflow files, and README contents via GitHub REST. Deep static AST analysis of individual repository files could further refine sub-skill inference.
