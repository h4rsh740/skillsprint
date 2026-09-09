import { CandidateEvidenceGraph } from "../evidence/types";
import { RoleReadinessAnalysis } from "../role-intelligence/types";
import { ActionPlanSummary, NextBestAction } from "./types";
import { formatSkillDisplay } from "../evidence/engine";

export interface ActionSelectionInputs {
  evidenceGraph: CandidateEvidenceGraph;
  roleReadiness?: RoleReadinessAnalysis | null;
  targetRoleTitle?: string;
  hasResume?: boolean;
  hasGithub?: boolean;
  hasInterview?: boolean;
  repositories?: string[];
}

export function selectHighestImpactAction(inputs: ActionSelectionInputs): ActionPlanSummary {
  const {
    evidenceGraph,
    roleReadiness,
    targetRoleTitle = "Software Engineer",
    hasResume = false,
    hasGithub = false,
    hasInterview = false,
    repositories = [],
  } = inputs;

  const primaryRepo = repositories.length > 0 ? repositories[0] : undefined;
  const actions: NextBestAction[] = [];

  // 1. Missing Required Skills from Target Role (P0)
  if (roleReadiness && roleReadiness.missingRequirements.length > 0) {
    const criticalMissing = roleReadiness.missingRequirements.filter(
      (m) => m.requirement.importance === "REQUIRED"
    );

    for (const item of criticalMissing) {
      const skillName = item.requirement.name;
      const canonical = item.requirement.normalizedName;

      if (canonical.includes("test") || canonical.includes("jest") || canonical.includes("cypress")) {
        const title = primaryRepo
          ? `Add Automated Test Suite to ${primaryRepo}`
          : "Add Automated Test Suite to Primary Repository";
        const why = primaryRepo
          ? `Testing is required by ${targetRoleTitle}, but repository ${primaryRepo} contains no automated test scripts or test suites.`
          : `Testing is required by ${targetRoleTitle}, but repository analysis detected zero automated test suites or CI/CD test commands.`;

        actions.push({
          id: `action-test-${Date.now()}`,
          title,
          category: "TESTING_COVERAGE",
          priority: "P0_CRITICAL",
          targetRole: targetRoleTitle,
          targetSkill: "Automated Testing",
          gapSkill: "Automated Testing",
          targetRequirement: item.requirement.name,
          evidence: primaryRepo
            ? `Repository ${primaryRepo} contains no test configuration or test files`
            : "Zero test suites detected across evidence graph",
          repository: primaryRepo,
          reason: why,
          whyThisAction: why,
          estimatedEffort: "2-4 hours",
          prerequisites: primaryRepo
            ? ["Node.js / package manager installed", `Local clone of ${primaryRepo}`]
            : ["Codebase with testing framework (Jest, Vitest, PyTest)"],
          evidenceToProduce: [
            "Unit tests configured with Jest, Vitest, or Node Test Runner",
            "Integration test cases covering primary API endpoints or core UI state flows",
            "`npm test` execution script added to package.json",
          ],
          completionCriteria: [
            "All unit and integration tests run successfully with 0 failures",
            primaryRepo
              ? `Test files committed to repository ${primaryRepo}`
              : "Test files committed to public GitHub repository",
            "Repository rescan confirms automated test presence",
          ],
          estimatedImpact: {
            points: 10,
            label: "ESTIMATED (+8-12 points)",
            basis: "Closes missing testing requirement; lifts Technical Skills and Project Evidence indices.",
          },
          isCompleted: false,
          verificationMethod: "GITHUB_RESCAN",
        });
      } else if (canonical.includes("docker") || canonical.includes("container") || canonical.includes("k8s")) {
        const title = primaryRepo
          ? `Containerize ${primaryRepo} with Docker`
          : "Containerize Web Application with Docker";
        const why = primaryRepo
          ? `Containerization is required for ${targetRoleTitle}, but zero Dockerfiles or container configuration exists in ${primaryRepo}.`
          : `Containerization is required for ${targetRoleTitle}, but zero Dockerfiles or container configuration exists in candidate evidence.`;

        actions.push({
          id: `action-docker-${Date.now()}`,
          title,
          category: "EVIDENCE_CLOSURE",
          priority: "P0_CRITICAL",
          targetRole: targetRoleTitle,
          targetSkill: "Docker",
          gapSkill: "Docker",
          targetRequirement: item.requirement.name,
          evidence: primaryRepo
            ? `No Dockerfile or docker-compose.yml found in ${primaryRepo}`
            : "No Dockerfiles found in candidate evidence graph",
          repository: primaryRepo,
          reason: why,
          whyThisAction: why,
          estimatedEffort: "1-2 hours",
          prerequisites: primaryRepo
            ? ["Docker Desktop installed", `Local clone of ${primaryRepo}`]
            : ["Docker Desktop installed"],
          evidenceToProduce: [
            "Multi-stage Dockerfile optimizing production image footprint",
            "docker-compose.yml orchestrating application server and database",
            "Clear local startup documentation in repository README.md",
          ],
          completionCriteria: [
            primaryRepo
              ? `Dockerfile committed to repository ${primaryRepo}`
              : "Dockerfile committed to project repository",
            "Container builds and runs application reliably",
            "Rescan detects container configuration in repository files",
          ],
          estimatedImpact: {
            points: 8,
            label: "ESTIMATED (+6-10 points)",
            basis: "Fulfills target role requirement for containerization across DevOps and backend dimensions.",
          },
          isCompleted: false,
          verificationMethod: "GITHUB_RESCAN",
        });
      } else {
        const formattedSkill = formatSkillDisplay(canonical);
        const title = primaryRepo
          ? `Ship a Production Feature Demonstrating ${formattedSkill} in ${primaryRepo}`
          : `Ship a Production Feature Demonstrating ${formattedSkill}`;
        const why = primaryRepo
          ? `Target role requires ${skillName}, but no verifiable evidence exists across repository ${primaryRepo} or resume.`
          : `Target role requires ${skillName}, but no verifiable evidence exists across Resume, GitHub, or Projects.`;

        actions.push({
          id: `action-skill-${canonical}-${Date.now()}`,
          title,
          category: "CODE_VERIFICATION",
          priority: "P0_CRITICAL",
          targetRole: targetRoleTitle,
          targetSkill: formattedSkill,
          gapSkill: formattedSkill,
          targetRequirement: skillName,
          evidence: primaryRepo
            ? `Repository ${primaryRepo} lacks source code files matching ${skillName}`
            : `Missing verifiable code or project evidence for ${skillName}`,
          repository: primaryRepo,
          reason: why,
          whyThisAction: why,
          estimatedEffort: "4-8 hours",
          prerequisites: primaryRepo
            ? [`Local development environment for ${primaryRepo}`]
            : ["Public Git repository"],
          evidenceToProduce: [
            `Feature or mini-project codebase utilizing ${skillName}`,
            `Documented usage in repository README with architecture explanation`,
            `Quantified bullet point in resume describing outcome`,
          ],
          completionCriteria: [
            primaryRepo
              ? `Active source code containing ${skillName} committed to ${primaryRepo}`
              : `Active source code containing ${skillName} committed to public GitHub repo`,
            `Demonstrable functionality verified on GitHub rescan`,
          ],
          estimatedImpact: {
            points: 8,
            label: "ESTIMATED (+6-8 points)",
            basis: `Transforms ${skillName} from MISSING to DIRECT evidence in Target Role Alignment.`,
          },
          isCompleted: false,
          verificationMethod: "GITHUB_RESCAN",
        });
      }
    }
  }

  // 2. Weak Profile Claims (P1: User claimed skill, but zero code proof)
  if (evidenceGraph.weakSkills.length > 0) {
    const topWeak = evidenceGraph.weakSkills[0];
    const title = primaryRepo
      ? `Provide Verifiable Repository Code for ${topWeak} in ${primaryRepo}`
      : `Provide Verifiable Repository Code for ${topWeak}`;
    const why = primaryRepo
      ? `You listed ${topWeak} on your profile, but repository ${primaryRepo} contains no source code corroborating this claim.`
      : `You listed ${topWeak} on your profile, but the evidence engine classifies it as WEAK because no repository code or production bullets corroborate it.`;

    actions.push({
      id: `action-weak-${Date.now()}`,
      title,
      category: "CODE_VERIFICATION",
      priority: "P1_HIGH",
      targetRole: targetRoleTitle,
      targetSkill: topWeak,
      gapSkill: topWeak,
      targetRequirement: topWeak,
      evidence: `Profile claim for ${topWeak} lacks repository code backing`,
      repository: primaryRepo,
      reason: why,
      whyThisAction: why,
      estimatedEffort: "2-3 hours",
      prerequisites: primaryRepo ? [`Access to ${primaryRepo}`] : ["Public GitHub repository"],
      evidenceToProduce: [
        `Public repository with ${topWeak} code making up at least 5% of repository volume`,
        `README section explaining how ${topWeak} was used to solve a practical problem`,
      ],
      completionCriteria: [
        `GitHub sync verifies ${topWeak} source code files`,
        `Classification promotes from WEAK to DIRECT`,
      ],
      estimatedImpact: {
        points: 6,
        label: "ESTIMATED (+5-7 points)",
        basis: "Eliminates ungrounded profile claims and increases overall evidence confidence to HIGH.",
      },
      isCompleted: false,
      verificationMethod: "GITHUB_RESCAN",
    });
  }

  // 3. Primary Evidence Deficits (P0 if missing resume or github)
  if (!hasResume) {
    actions.push({
      id: `action-resume-${Date.now()}`,
      title: "Upload Technical Resume for ATS Grounding",
      category: "RESUME_ALIGNMENT",
      priority: "P0_CRITICAL",
      targetRole: targetRoleTitle,
      targetSkill: "Resume Evidence",
      gapSkill: "Resume Evidence",
      targetRequirement: "ATS-Parsed Technical Resume",
      evidence: "No resume document uploaded in profile",
      reason: "No resume has been uploaded. An uploaded resume provides verified work history, projects, and ATS alignment.",
      whyThisAction: "No resume has been uploaded. An uploaded resume provides verified work history, projects, and ATS alignment.",
      estimatedEffort: "15-30 minutes",
      prerequisites: ["Updated PDF resume with metric-driven project descriptions"],
      evidenceToProduce: ["Technical resume in PDF format with metric-driven bullet points"],
      completionCriteria: ["Resume uploaded and successfully parsed by deterministic ATS engine"],
      estimatedImpact: {
        points: 18,
        label: "ESTIMATED (+15-20 points)",
        basis: "Activates Resume Strength dimension (20% weight) currently contributing 0 points.",
      },
      isCompleted: false,
      verificationMethod: "RESUME_RESCAN",
    });
  }

  if (!hasGithub) {
    actions.push({
      id: `action-github-${Date.now()}`,
      title: "Connect GitHub Account for Codebase Verification",
      category: "CODE_VERIFICATION",
      priority: "P0_CRITICAL",
      targetRole: targetRoleTitle,
      targetSkill: "Codebase Evidence",
      gapSkill: "Codebase Evidence",
      targetRequirement: "Connected GitHub Repository Portfolio",
      evidence: "Zero connected GitHub repositories or commit histories",
      reason: "Connecting GitHub enables deterministic ingestion of real languages, pull requests, CI/CD, and repository health.",
      whyThisAction: "Connecting GitHub enables deterministic ingestion of real languages, pull requests, CI/CD, and repository health.",
      estimatedEffort: "2 minutes",
      prerequisites: ["Active GitHub account with public code repositories"],
      evidenceToProduce: ["Linked active GitHub account with public repositories"],
      completionCriteria: ["GitHub account connected and initial analysis synced"],
      estimatedImpact: {
        points: 15,
        label: "ESTIMATED (+12-16 points)",
        basis: "Activates Project Evidence and Code Quality signals.",
      },
      isCompleted: false,
      verificationMethod: "GITHUB_RESCAN",
    });
  }

  if (!hasInterview) {
    actions.push({
      id: `action-interview-${Date.now()}`,
      title: "Complete First Mock Technical Interview",
      category: "INTERVIEW_BENCHMARK",
      priority: "P1_HIGH",
      targetRole: targetRoleTitle,
      targetSkill: "Oral Problem Solving",
      gapSkill: "Oral Problem Solving",
      targetRequirement: "Mock Interview Performance Evaluation",
      evidence: "No technical mock interview recordings or transcripts found",
      reason: "Demonstrate technical verbal articulation, problem solving, and architecture design under timed conditions.",
      whyThisAction: "Demonstrate technical verbal articulation, problem solving, and architecture design under timed conditions.",
      estimatedEffort: "20-30 minutes",
      prerequisites: ["Working microphone and quiet environment"],
      evidenceToProduce: ["Recorded evaluation from 3 mock interview questions"],
      completionCriteria: ["Complete simulation session and submit answers for evaluation"],
      estimatedImpact: {
        points: 12,
        label: "ESTIMATED (+10-14 points)",
        basis: "Activates Interview Readiness dimension (15% weight) with real evaluation data.",
      },
      isCompleted: false,
      verificationMethod: "INTERVIEW_RETAKE",
    });
  }

  // Fallback if candidate already has exceptional scores across all criteria
  if (actions.length === 0) {
    actions.push({
      id: `action-maintain-${Date.now()}`,
      title: primaryRepo
        ? `Publish Architectural Case Study for ${primaryRepo}`
        : "Publish Case Study and Engage Open Source",
      category: "CODE_VERIFICATION",
      priority: "P2_MEDIUM",
      targetRole: targetRoleTitle,
      targetSkill: "System Architecture",
      gapSkill: "System Architecture",
      targetRequirement: "Technical Writing & Architecture Demonstration",
      evidence: "Candidate possesses strong baseline across all required dimensions",
      repository: primaryRepo,
      reason: "All core required skills are verified. Deepen market visibility with production case studies.",
      whyThisAction: "All core required skills are verified. Deepen market visibility with production case studies.",
      estimatedEffort: "3-5 hours",
      prerequisites: primaryRepo ? [`Completed project in ${primaryRepo}`] : ["Completed software project"],
      evidenceToProduce: ["Technical write-up or published blog post on project architecture"],
      completionCriteria: ["Case study published on portfolio or GitHub README"],
      estimatedImpact: {
        points: 4,
        label: "ESTIMATED (+3-5 points)",
        basis: "Refines portfolio completeness and recruiter radar score.",
      },
      isCompleted: false,
      verificationMethod: "PORTFOLIO_AUDIT",
    });
  }

  // Order actions by priority: P0_CRITICAL first, then P1_HIGH, then P2_MEDIUM
  const priorityOrder: Record<string, number> = {
    P0_CRITICAL: 0,
    P1_HIGH: 1,
    P2_MEDIUM: 2,
  };

  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const primaryAction = actions[0];
  const secondaryActions = actions.slice(1, 4);

  const achievablePoints = actions
    .slice(0, 3)
    .reduce((sum, a) => sum + a.estimatedImpact.points, 0);

  return {
    primaryAction,
    secondaryActions,
    totalGapsIdentified: actions.length,
    criticalGapsCount: actions.filter((a) => a.priority === "P0_CRITICAL").length,
    achievablePointsPotential: Math.min(30, achievablePoints),
  };
}
