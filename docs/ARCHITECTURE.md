# SkillSprint AI — Technical Architecture

## 1. Architectural Philosophy

SkillSprint AI operates under the **Evidence-First Career Intelligence** standard:

```
RAW CANDIDATE SIGNALS
(Resume PDF, GitHub REST, Mock Interviews, Live Portfolio, Claimed Profile)
       ↓
NORMALIZATION & CANONICALIZATION
(Canonical Skill Dictionaries, Case-Insensitive Tokenizers, Section Analyzers)
       ↓
EVIDENCE ENGINE
(DIRECT, INFERRED, WEAK, MISSING, CONFLICTING)
       ↓
DETERMINISTIC ROLE INTELLIGENCE & READINESS
(Target Role Profile Matching, Proportional Dimensional Scoring)
       ↓
AI REASONING & SYNTHESIS
(Gemini REST / OpenRouter with Schema Enforcement)
       ↓
GROUND TRUTH CLAIM VALIDATION
(Anti-Hallucination Verification against Candidate Evidence Graph)
       ↓
PERSISTENCE & CAREER TWIN COMMAND CENTER
(Prisma / Supabase Postgres, Real-Time Dynamic Dashboard)
```

**Guiding Rule**:
Deterministic logic is strictly used for scores, classifications, calculations, thresholds, and evidence aggregation. AI is used exclusively for extraction, contextual reasoning, natural language synthesis, and interactive career coaching.

---

## 2. System Components

### 2.1 Evidence Engine (`src/lib/evidence/`)
- **Types** (`src/lib/evidence/types.ts`): Reusable evidence representation supporting 6 sources (`RESUME`, `GITHUB`, `PROJECT`, `PORTFOLIO`, `INTERVIEW`, `USER_INPUT`), 5 classifications (`DIRECT`, `INFERRED`, `WEAK`, `MISSING`, `CONFLICTING`), and 3 confidence levels (`HIGH`, `MEDIUM`, `LOW`).
- **Engine** (`src/lib/evidence/engine.ts`):
  - Ingests multi-source candidate signals.
  - Multi-source corroboration: Skills confirmed in both Resume experience bullets and GitHub repository code receive `DIRECT` classification, `HIGH` confidence, and score >= 80.
  - Inferential knowledge: High-level frameworks automatically infer foundational competencies (e.g. `Next.js` implies `React` and `TypeScript`; `FastAPI` implies `Python`; `Prisma` implies relational databases and `SQL`).
  - Contradiction & weakness detection: Profile-only claims with zero code proof are categorized as `WEAK`. Discrepancies between claimed mastery and poor technical interview results are categorized as `CONFLICTING`.
  - Anti-gaming rule: Raw commit counts or daily streaks are never treated as proof of skill expertise.

### 2.2 Target Role Intelligence (`src/lib/role-intelligence/`)
- **Types** (`src/lib/role-intelligence/types.ts`): Standardized `TargetRoleProfile`, `NormalizedRoleRequirement`, and `RoleReadinessAnalysis`.
- **Extractor** (`src/lib/role-intelligence/extractor.ts`): Parses job descriptions or target role titles into required skills, preferred skills, seniority levels (`Intern`, `Junior`, `Mid-Level`, `Senior`, `Lead`), experience years, and project expectations.
- **Matcher** (`src/lib/role-intelligence/matcher.ts`): Evaluates candidate evidence against target requirements, categorizing each requirement as `MATCHED`, `PARTIAL`, `WEAK_EVIDENCE`, or `MISSING`.

### 2.3 Explainable Career Readiness (`src/lib/readiness/`)
- **Types** (`src/lib/readiness/types.ts`): `ExplainableReadiness`, `ScoreFactor`.
- **Engine** (`src/lib/readiness/engine.ts`):
  - Eliminates opaque, hardcoded constants.
  - Calculates deterministic readiness across actual available dimensions: Technical Skills, Project Evidence, Resume Strength, Target Role Alignment, Interview Readiness, Portfolio.
  - Dynamically normalizes active weights if an integration is unlinked (e.g., mock interview not taken yet) while honestly tagging it as `MISSING_DATA` with 0 contribution.
  - Generates transparent, human-readable explanations answering: *Why is this score 72/100?*

### 2.4 AI Claim & Ground Truth Validator (`src/lib/validation/`)
- **Types** (`src/lib/validation/types.ts`): `ClaimVerificationResult`, `CandidateGroundTruth`, `CareerTwinValidationReport`.
- **Validator** (`src/lib/validation/claimValidator.ts`):
  - Builds candidate ground truth facts from verified repositories, experience, and certifications.
  - Inspects AI claims in Career Twin SWOT, roadmaps, and recommendations.
  - Rejects ungrounded claims (e.g., AI claiming production Kubernetes when candidate has zero container evidence) and downgrades unverified claims with clear user-facing notices.

### 2.5 Highest-Impact Action Engine (`src/lib/action-engine/`)
- **Types** (`src/lib/action-engine/types.ts`): `NextBestAction`, `ActionPlanSummary`.
- **Engine** (`src/lib/action-engine/engine.ts`):
  - Identifies the single highest-value action to improve career readiness.
  - Prioritization hierarchy:
    1. Target-role critical missing skills (P0)
    2. Unverified profile claims (P1)
    3. Primary integration deficits (P0/P1)
  - Provides concrete completion criteria, evidence to produce, and realistic score impact labeled explicitly as `ESTIMATED`.

---

## 3. Data Flow & The Continuous Career Twin Loop

```
1. OBSERVE
   User connects GitHub, uploads resume, completes interview, or selects target role.

2. COLLECT EVIDENCE
   Candidate assets are parsed into normalized EvidenceItems.

3. BUILD CAREER TWIN
   CandidateEvidenceGraph aggregates multi-source corroboration and flags weaknesses.

4. DIAGNOSE READINESS
   Compare evidence against TargetRoleProfile.
   Compute ExplainableReadiness with contributing factors and exact points.

5. SELECT NEXT BEST ACTION
   Highest-Impact Action Engine selects single priority action to close top gap.

6. USER ACTS
   Candidate commits tests, builds container, or updates resume.

7. RESCAN & MEASURE CHANGE
   Rescan updates EvidenceGraph, promotes skill classification, recalculates readiness,
   and shifts next recommendation to the next gap.
```

---

## 4. Verification & Testing

- **Automated Unit & Integration Tests**: 17 tests running natively on `node:test` via `npx tsx --test 'tests/**/*.test.ts'` covering evidence normalization, inferential relations, role matching, claim validation, and adaptive rescan.
- **Reproducible Benchmark Evaluation**: `scripts/benchmark/run_benchmark.ts` evaluates 8 held-out synthetic resumes, 6 career roadmaps, and 4 career twin projections with live API calls and transparent fallback provenance.
