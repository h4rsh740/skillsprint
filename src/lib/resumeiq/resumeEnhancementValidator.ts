import { EnhancedResume, ResumeData } from "./types";
import { textContainsKeyword } from "./keywords";

function extractMetrics(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?(?:k|m|b)?|\b\d+(?:\.\d+)?\b/gi) || [];
  return matches.map(m => m.toLowerCase());
}

export function validateEnhancedResume(
  enhanced: EnhancedResume,
  original: ResumeData
): { sanitized: EnhancedResume; violations: string[] } {
  const violations: string[] = [];
  const sanitized: EnhancedResume = JSON.parse(JSON.stringify(enhanced));

  // 1. Candidate Details Protection
  if (sanitized.name !== original.name) {
    violations.push(`Restored candidate name: "${original.name}" (AI modified it to "${sanitized.name}")`);
    sanitized.name = original.name;
  }
  if (sanitized.email !== original.email) {
    violations.push(`Restored candidate email: "${original.email}"`);
    sanitized.email = original.email;
  }
  if (sanitized.phone !== original.phone) {
    violations.push(`Restored candidate phone: "${original.phone}"`);
    sanitized.phone = original.phone;
  }

  // 2. Factual Integrity for Experience
  // Match by index. If AI changes company name, dates or introduces invented metrics, revert.
  sanitized.experience = (sanitized.experience || []).map((exp, idx) => {
    const origExp = original.experience[idx];
    if (!origExp) {
      violations.push(`Removed extra work experience entry: "${exp.company}"`);
      return null;
    }

    const company = exp.company !== origExp.company ? origExp.company : exp.company;
    if (exp.company !== origExp.company) {
      violations.push(`Restored company name "${origExp.company}" (AI modified it to "${exp.company}")`);
    }

    const position = exp.position !== origExp.position ? origExp.position : exp.position;
    if (exp.position !== origExp.position) {
      violations.push(`Restored position "${origExp.position}" for company "${company}" (AI modified it to "${exp.position}")`);
    }

    const startDate = exp.startDate !== origExp.startDate ? origExp.startDate : exp.startDate;
    const endDate = exp.endDate !== origExp.endDate ? origExp.endDate : exp.endDate;
    if (exp.startDate !== origExp.startDate || exp.endDate !== origExp.endDate) {
      violations.push(`Restored original dates for company "${company}": "${origExp.startDate} - ${origExp.endDate}"`);
    }

    // Bullet point metrics check (Anti-hallucination)
    const bullets = exp.bullets.map((b, bIdx) => {
      const origB = origExp.bullets[bIdx];
      if (!origB) return b; // AI added a new bullet, which is ok, but we must check for metrics

      const enhancedMetrics = extractMetrics(b);
      const originalMetrics = extractMetrics(origB);

      // Check if AI fabricated new numbers/metrics
      const fabricated = enhancedMetrics.filter(m => !originalMetrics.includes(m));
      if (fabricated.length > 0) {
        violations.push(`Reverted bullet point in "${company}" due to fabricated metric(s): "${fabricated.join(", ")}"`);
        return origB; // Revert to original bullet
      }

      return b;
    });

    return {
      ...exp,
      company,
      position,
      startDate,
      endDate,
      bullets,
    };
  }).filter(Boolean) as any;

  // 3. Factual Integrity for Projects
  sanitized.projects = (sanitized.projects || []).map((proj, idx) => {
    const origProj = original.projects[idx];
    if (!origProj) {
      violations.push(`Removed extra project entry: "${proj.name}"`);
      return null;
    }

    const name = proj.name !== origProj.name ? origProj.name : proj.name;
    if (proj.name !== origProj.name) {
      violations.push(`Restored project name "${origProj.name}" (AI modified it to "${proj.name}")`);
    }

    const bullets = proj.bullets.map((b, bIdx) => {
      const origB = origProj.bullets[bIdx];
      if (!origB) return b;

      const enhancedMetrics = extractMetrics(b);
      const originalMetrics = extractMetrics(origB);

      const fabricated = enhancedMetrics.filter(m => !originalMetrics.includes(m));
      if (fabricated.length > 0) {
        violations.push(`Reverted bullet point in project "${name}" due to fabricated metric(s): "${fabricated.join(", ")}"`);
        return origB;
      }

      return b;
    });

    return {
      ...proj,
      name,
      bullets,
    };
  }).filter(Boolean) as any;

  // 4. Factual Integrity for Education
  sanitized.education = (sanitized.education || []).map((edu, idx) => {
    const origEdu = original.education[idx];
    if (!origEdu) {
      violations.push(`Removed extra education entry: "${edu.school}"`);
      return null;
    }

    const school = edu.school !== origEdu.school ? origEdu.school : edu.school;
    if (edu.school !== origEdu.school) {
      violations.push(`Restored school name "${origEdu.school}" (AI modified it to "${edu.school}")`);
    }

    const degree = edu.degree !== origEdu.degree ? origEdu.degree : edu.degree;
    if (edu.degree !== origEdu.degree) {
      violations.push(`Restored degree "${origEdu.degree}" (AI modified it to "${edu.degree}")`);
    }

    return {
      ...edu,
      school,
      degree,
      startDate: origEdu.startDate,
      endDate: origEdu.endDate,
    };
  }).filter(Boolean) as any;

  // 5. Skills Anti-Hallucination
  // Filter out any skills added by AI that were NOT present anywhere in the original resume text.
  const origTextLower = original.rawText.toLowerCase() + " " + original.skills.join(" ").toLowerCase();
  sanitized.skills = (sanitized.skills || []).filter(skill => {
    const isPresent = textContainsKeyword(origTextLower, skill);
    if (!isPresent) {
      violations.push(`Removed fabricated skill: "${skill}" (No evidence in original resume)`);
      return false;
    }
    return true;
  });

  return { sanitized, violations };
}
