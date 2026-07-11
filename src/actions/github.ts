"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "./auth";
import { decrypt } from "@/lib/encryption";
import { generateStructuredAIResponse, MODELS } from "@/lib/ai";

export type GitHubAnalysisResult = {
  githubScore: number;
  consistencyScore: number;
  projectQuality: number;
  openSourceSignal: "High" | "Medium" | "Low";
  developerLevel: string;
  repositoriesCount: number;
  privateReposCount: number;
  languagesUsed: { name: string; percentage: number }[];
  repositoryHealth: {
    name: string;
    signal: "High" | "Medium" | "Low";
    insight: string;
  }[];
  commitStreak: number;
  cicdActive: boolean;
  issuesResolved: number;
  pullRequestsCount: number;
  readmeQuality: "High" | "Medium" | "Low";
  avatarUrl?: string;
  syncTime?: string;
  totalStars?: number;
  totalForks?: number;
};

// GitHub-aware fetch: throws a precise, user-facing error and detects
// rate limiting. Signals a special "AUTH_RETRY" error on 401 so callers
// can retry without the token. We deliberately do NOT silently fall back
// to unauthenticated requests on 403 — the unauthenticated GitHub API is
// heavily rate-limited (60/hr per IP) and that fallback is what breaks sync.
class GitHubAuthRetry extends Error {
  githubDetail?: string;
  constructor(message: string, detail?: string) {
    super(message);
    this.name = "GitHubAuthRetry";
    this.githubDetail = detail;
  }
}

async function githubFetch(url: string, headers: HeadersInit, allowUnauthFallback = true): Promise<Response> {
  const res = await fetch(url, { headers });
  if (res.ok) return res;

  let detail = "";
  try {
    const body = await res.json();
    detail = body?.message || "";
  } catch {
    /* ignore body parse errors */
  }

  if (res.status === 403 && /rate limit/i.test(detail)) {
    throw new Error(
      "GitHub API rate limit exceeded. Reconnect your GitHub account (or wait for the limit to reset) and try again."
    );
  }

  if (res.status === 401 && allowUnauthFallback) {
    throw new GitHubAuthRetry("AUTH_RETRY", detail || `GitHub 401 for ${url}`);
  }

  throw new Error(detail || `GitHub API request failed (${res.status}) for ${url}`);
}

async function fetchRepoDetails(owner: string, name: string, headers: HeadersInit) {
  let hasReadme = false;
  let readmeSize = 0;
  let hasActions = false;
  let recentCommits = 0;
  let languagesMap: Record<string, number> = {};

  try {
    const [languagesRes, readmeRes, workflowsRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${name}/languages`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`https://api.github.com/repos/${owner}/${name}/readme`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`https://api.github.com/repos/${owner}/${name}/actions/workflows`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`https://api.github.com/repos/${owner}/${name}/commits?per_page=10`, { headers }).then(r => r.ok ? r.json() : null)
    ]);

    if (languagesRes) {
      languagesMap = languagesRes;
    }
    if (readmeRes) {
      hasReadme = true;
      readmeSize = readmeRes.size || 0;
    }
    if (workflowsRes && workflowsRes.total_count > 0) {
      hasActions = true;
    }
    if (commitsRes && Array.isArray(commitsRes)) {
      recentCommits = commitsRes.length;
    }
  } catch (err) {
    console.warn(`Failed to fetch details for repo ${owner}/${name}:`, err);
  }

  return {
    hasReadme,
    readmeSize,
    hasActions,
    recentCommits,
    languagesMap
  };
}

export async function getConnectedGitHubAccount() {
  const user = await getSessionUser();
  if (!user) return null;
  return await db.getGitHubAccountByUserId(user.id);
}

export async function analyzeGitHub(username?: string): Promise<GitHubAnalysisResult> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  let githubUsername: string;
  if (username) {
    githubUsername = username;
  } else {
    const githubAccount = await db.getGitHubAccountByUserId(user.id);
    if (!githubAccount || !githubAccount.username) {
      throw new Error("No connected GitHub account found. Please connect your GitHub account.");
    }
    githubUsername = githubAccount.username;
  }

  // Try to retrieve encrypted access token from DB
  const oauthToken = await db.getOAuthToken(user.id, "github");
  let token = process.env.GITHUB_TOKEN;
  if (oauthToken?.accessToken) {
    try {
      token = decrypt(oauthToken.accessToken);
    } catch (e) {
      console.error("[analyzeGitHub] Token decryption failed, falling back to env token:", e);
    }
  }

  // A mock/placeholder token can never authenticate. Surface a clear,
  // actionable error instead of silently falling back to the rate-limited
  // unauthenticated GitHub API (which would fail with a generic message).
  if (token && token.startsWith("mock-")) {
    throw new Error(
      "Your GitHub connection has no valid access token. Please reconnect GitHub using the 'Connect GitHub' button on the GitHub page."
    );
  }

  let headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "SkillSprint-AI"
  };
  
  if (token) {
    headers = {
      ...headers,
      Authorization: `token ${token}`
    };
  }

  // 1. Fetch User details
  let publicRepos = 0;
  let privateRepos = 0;
  let avatarUrl = "";
  let displayName = githubUsername;

  try {
    const userRes = await githubFetch(`https://api.github.com/users/${githubUsername}`, headers);
    const userData = await userRes.json();
    publicRepos = userData.public_repos || 0;
    avatarUrl = userData.avatar_url || "";
    displayName = userData.name || userData.login || githubUsername;
  } catch (err: any) {
    // If the authenticated request was rejected (401, e.g. expired token),
    // retry once without the token.
    if (err instanceof GitHubAuthRetry) {
      try {
        const fallbackHeaders = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "SkillSprint-AI",
        };
        const userRes = await githubFetch(`https://api.github.com/users/${githubUsername}`, fallbackHeaders, false);
        const userData = await userRes.json();
        publicRepos = userData.public_repos || 0;
        avatarUrl = userData.avatar_url || "";
        displayName = userData.name || userData.login || githubUsername;
      } catch (fallbackErr: any) {
        console.error("Failed to query GitHub user (fallback):", fallbackErr);
        throw new Error(fallbackErr?.message || "Unable to synchronize GitHub repositories.");
      }
    } else {
      console.error("Failed to query live GitHub endpoints:", err);
      throw new Error(err?.message || "Unable to synchronize GitHub repositories.");
    }
  }

  // 2. Fetch authenticated user details (if token is valid) to read private repos
  if (token && !token.startsWith("mock-")) {
    try {
      const authUserRes = await fetch("https://api.github.com/user", { headers });
      if (authUserRes.ok) {
        const authData = await authUserRes.json();
        if (authData.login.toLowerCase() === githubUsername.toLowerCase()) {
          privateRepos = authData.total_private_repos || 0;
        }
      }
    } catch (_) {}
  }

  // 3. Fetch Repositories
  let repos: any[] = [];
  try {
    const reposUrl =
      token && !token.startsWith("mock-")
        ? "https://api.github.com/user/repos?per_page=100&sort=updated"
        : `https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`;
    const reposRes = await githubFetch(reposUrl, headers);
    repos = await reposRes.json();
    if (!Array.isArray(repos)) {
      throw new Error("GitHub did not return a valid repository list.");
    }
  } catch (err: any) {
    // Retry without the token only if the authenticated request was rejected.
    if (err instanceof GitHubAuthRetry && token && !token.startsWith("mock-")) {
      try {
        const fallbackHeaders = {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "SkillSprint-AI",
        };
        const reposRes = await githubFetch(
          `https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`,
          fallbackHeaders,
          false
        );
        repos = await reposRes.json();
        if (!Array.isArray(repos)) throw new Error("GitHub did not return a valid repository list.");
      } catch (fallbackErr: any) {
        console.error("Failed to fetch repositories (fallback):", fallbackErr);
        throw new Error(fallbackErr?.message || "Unable to synchronize GitHub repositories.");
      }
    } else {
      console.error("Failed to fetch repositories:", err);
      throw new Error(err?.message || "Unable to synchronize GitHub repositories.");
    }
  }

  // 4. Fetch User events (for streaks and consistency)
  let events: any[] = [];
  try {
    const eventsRes = await githubFetch(`https://api.github.com/users/${githubUsername}/events`, headers, false);
    if (eventsRes.ok) {
      events = await eventsRes.json();
    }
  } catch (err) {
    console.warn("Failed to fetch events from GitHub (non-blocking):", err);
  }

  const pushEvents = Array.isArray(events) ? events.filter((e: any) => e.type === "PushEvent") : [];
  const prEvents = Array.isArray(events) ? events.filter((e: any) => e.type === "PullRequestEvent") : [];
  const issueEvents = Array.isArray(events) ? events.filter((e: any) => e.type === "IssuesEvent") : [];

  const streak = pushEvents.length;
  const prCount = prEvents.length;
  const resolvedIssues = issueEvents.filter((e: any) => e.payload?.action === "closed").length;

  // 5. Query detailed info for top repositories (up to 5)
  const topRepos = repos.slice(0, 5);
  const healthDataToAnalyze = await Promise.all(
    topRepos.map(async (repo: any) => {
      const details = await fetchRepoDetails(repo.owner.login, repo.name, headers);
      return {
        name: repo.name,
        language: repo.language || "Unknown",
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        openIssues: repo.open_issues_count || 0,
        archived: repo.archived || false,
        hasActions: details.hasActions,
        hasReadme: details.hasReadme,
        readmeSize: details.readmeSize,
        recentCommits: details.recentCommits,
        languagesMap: details.languagesMap
      };
    })
  );

  // 6. Aggregate language statistics dynamically using Language API byte counts
  const aggregatedLanguages: Record<string, number> = {};
  healthDataToAnalyze.forEach(item => {
    Object.entries(item.languagesMap).forEach(([lang, bytes]) => {
      aggregatedLanguages[lang] = (aggregatedLanguages[lang] || 0) + bytes;
    });
  });

  const totalBytes = Object.values(aggregatedLanguages).reduce((sum, val) => sum + val, 0);
  let languages: { name: string; percentage: number }[] = [];
  if (totalBytes > 0) {
    languages = Object.entries(aggregatedLanguages).map(([name, bytes]) => ({
      name,
      percentage: Math.round((bytes / totalBytes) * 100)
    })).sort((a, b) => b.percentage - a.percentage);
  }

  // 7. Calculate Repository Health & Dynamic AI Insights
  let repositoryHealth: { name: string; signal: "High" | "Medium" | "Low"; insight: string }[] = [];
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  for (const item of healthDataToAnalyze) {
    let signal: "High" | "Medium" | "Low" = "Medium";
    let insight = "";

    // Heuristics for local fallback / simulated payload
    if (item.archived) {
      signal = "Low";
      insight = `Repository is archived. Recommended to keep dependencies read-only or remove old references.`;
    } else if (!item.hasReadme) {
      signal = "Low";
      insight = `No README documentation found. Add a comprehensive README.md detailing project setup, usage, and structure.`;
    } else if (item.stars > 10 || item.recentCommits > 5) {
      signal = "High";
      insight = `Strong project velocity in ${item.language} with active commits. Keep maintaining unit tests and CI/CD.`;
    } else if (!item.hasActions) {
      signal = "Medium";
      insight = `Solid baseline codebase using ${item.language}. Implementing a GitHub Actions workflow for testing is recommended.`;
    } else {
      signal = "Medium";
      insight = `Active project. Add unit testing coverage and deployment hooks to increase completeness.`;
    }

    if (geminiApiKey || openRouterApiKey) {
      try {
        const systemPrompt = "You are an expert software engineering auditor. Analyze the repository metadata and return a JSON object with 'signal' ('High' | 'Medium' | 'Low') and 'insight' (a concise 1-2 sentence recommendation/assessment). Do not wrap the JSON output in markdown backticks.";
        const prompt = `Analyze this repository:
Name: ${item.name}
Language: ${item.language}
Stars: ${item.stars}
Forks: ${item.forks}
Open Issues: ${item.openIssues}
Has CI/CD: ${item.hasActions ? "Yes" : "No"}
Has README: ${item.hasReadme ? `Yes (${item.readmeSize} bytes)` : "No"}
Recent Commits in 30 days: ${item.recentCommits}

Return JSON of format:
{
  "signal": "High" | "Medium" | "Low",
  "insight": "assessment and recommendation"
}`;
        
        const aiResponse = await generateStructuredAIResponse(
          prompt,
          systemPrompt,
          MODELS.RESUME_ANALYSIS,
          { signal, insight }
        );
        if (aiResponse && aiResponse.signal && aiResponse.insight) {
          signal = aiResponse.signal;
          insight = aiResponse.insight;
        }
      } catch (err) {
        console.warn(`Failed to generate AI health analysis for repo ${item.name}, using rules fallback:`, err);
      }
    }

    repositoryHealth.push({
      name: item.name,
      signal,
      insight
    });
  }

  // 8. Calculate dynamic developer metrics
  const reposCount = publicRepos + privateRepos;
  const starsCount = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const forksCount = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);

  const reposPoints = Math.min(reposCount, 15);
  const starsPoints = Math.min(starsCount * 5, 25);
  const forksPoints = Math.min(forksCount * 3, 15);
  const streakPoints = Math.min(streak * 3, 15);
  const prPoints = Math.min(prCount * 2, 10);
  const issuePoints = Math.min(resolvedIssues * 2, 10);
  
  const cicdPoints = healthDataToAnalyze.some(r => r.hasActions) ? 5 : 0;
  const readmeCount = healthDataToAnalyze.filter(r => r.hasReadme).length;
  const readmePoints = healthDataToAnalyze.length > 0 ? Math.round((readmeCount / healthDataToAnalyze.length) * 5) : 0;

  const githubScore = Math.min(
    reposPoints + starsPoints + forksPoints + streakPoints + prPoints + issuePoints + cicdPoints + readmePoints,
    100
  );

  let developerLevel = "Beginner Developer";
  if (githubScore >= 90) developerLevel = "Principal Engineer";
  else if (githubScore >= 80) developerLevel = "Staff Engineer";
  else if (githubScore >= 65) developerLevel = "Senior Engineer";
  else if (githubScore >= 50) developerLevel = "Software Engineer";
  else if (githubScore >= 35) developerLevel = "Associate Engineer";
  else if (githubScore >= 20) developerLevel = "Junior Developer";

  const consistencyScore = Math.min(50 + (streak * 3) + (prCount * 4), 100);
  const projectQuality = Math.min(60 + (starsCount * 4) + (forksCount * 5) + (healthDataToAnalyze.some(r => r.hasActions) ? 15 : 0), 100);
  const openSourceSignal = githubScore > 75 ? "High" : githubScore > 45 ? "Medium" : "Low";

  const result: GitHubAnalysisResult = {
    githubScore,
    consistencyScore: Math.round(consistencyScore),
    projectQuality: Math.round(projectQuality),
    openSourceSignal,
    developerLevel,
    repositoriesCount: publicRepos,
    privateReposCount: privateRepos,
    languagesUsed: languages,
    repositoryHealth,
    commitStreak: streak,
    cicdActive: healthDataToAnalyze.some(r => r.hasActions),
    issuesResolved: resolvedIssues,
    pullRequestsCount: prCount,
    readmeQuality: readmeCount === healthDataToAnalyze.length ? "High" : readmeCount > 0 ? "Medium" : "Low",
    avatarUrl,
    syncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    totalStars: starsCount,
    totalForks: forksCount
  };

  // 9. Persist into the database
  const account = await db.saveGitHubAccount(user.id, {
    username: githubUsername,
    displayName,
    avatarUrl,
    email: user.email,
    publicRepos,
    privateRepos
  });

  await db.saveGitHubAnalysis(user.id, {
    githubAccountId: account.id,
    publicReposCount: publicRepos,
    privateReposCount: privateRepos,
    pinnedRepos: repositoryHealth,
    languagesUsed: languages,
    commitHistory: { streak, prCount, resolvedIssues, totalCommits: streak },
    stars: starsCount,
    forks: forksCount,
    openIssues: repos.reduce((sum, r) => sum + (r.open_issues_count || 0), 0),
    closedIssues: resolvedIssues,
    pullRequests: prCount,
    readmeQuality: result.readmeQuality,
    docsQuality: result.readmeQuality,
    branchStrategy: "GitFlow Standard",
    deploymentStatus: "Active Integrations",
    cicdStatus: result.cicdActive ? "Active GitHub Actions" : "Inactive",
    codeOwnership: "100% Owner",
    contributionStreak: streak,
    portfolioCompleteness: githubScore,
    suggestions: [
      "Ensure all repositories have custom README.md document guides.",
      result.cicdActive ? "Review CI/CD deployment outputs for any warning signals." : "Activate GitHub Actions CI/CD workflows for automated builds.",
      "Archive inactive and duplicate learning/note repositories to clean portfolio footprint."
    ]
  });

  await db.createSyncHistory(user.id, {
    provider: "github",
    status: "success",
    details: { username: githubUsername, score: result.githubScore }
  });

  await db.createNotification(user.id, {
    title: "GitHub Synchronized",
    message: `Your GitHub repository footprint has been analyzed. Score: ${result.githubScore}/100.`
  });

  return result;
}
