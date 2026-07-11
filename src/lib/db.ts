import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

// Define the file path for local fallback database
const DB_FILE = path.join(process.cwd(), "prisma", "db.json");

// Helper to initialize the local JSON database with all 17 tables if it doesn't exist
function getLocalDB() {
  if (DB_CONFIGURED) {
    throw new Error(
      "Local JSON DB fallback is disabled because DATABASE_URL is configured. " +
      "A Prisma query failed upstream; fix the database connection instead of silently writing to ephemeral storage."
    );
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      profiles: [],
      github_accounts: [],
      linkedin_accounts: [],
      oauth_tokens: [],
      resume_files: [],
      resume_analysis: [],
      github_analysis: [],
      linkedin_analysis: [],
      career_scores: [],
      career_twins: [],
      recommended_projects: [],
      roadmaps: [],
      learning_progress: [],
      activity_logs: [],
      mentor_sessions: [],
      notifications: [],
      sync_history: [],
      portfolios: [], // For legacy compatibility with portfolio audit actions
      hackathons: [] // For legacy compatibility
    };
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data || "{}");
    
    // Ensure all new arrays exist in the loaded data
    const keys = [
      "users", "profiles", "github_accounts", "linkedin_accounts", "oauth_tokens",
      "resume_files", "resume_analysis", "github_analysis", "linkedin_analysis",
      "career_scores", "career_twins", "recommended_projects", "roadmaps",
      "learning_progress", "activity_logs", "mentor_sessions", "notifications",
      "sync_history", "portfolios", "hackathons"
    ];
    let changed = false;
    keys.forEach(k => {
      if (!parsed[k]) {
        parsed[k] = [];
        changed = true;
      }
    });
    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch (err) {
    return {
      users: [],
      profiles: [],
      github_accounts: [],
      linkedin_accounts: [],
      oauth_tokens: [],
      resume_files: [],
      resume_analysis: [],
      github_analysis: [],
      linkedin_analysis: [],
      career_scores: [],
      career_twins: [],
      recommended_projects: [],
      roadmaps: [],
      learning_progress: [],
      activity_logs: [],
      mentor_sessions: [],
      notifications: [],
      sync_history: [],
      portfolios: [],
      hackathons: []
    };
  }
}

function saveLocalDB(data: any) {
  if (DB_CONFIGURED) {
    throw new Error(
      "Local JSON DB fallback is disabled because DATABASE_URL is configured. " +
      "A Prisma write failed upstream; fix the database connection instead of silently writing to ephemeral storage."
    );
  }
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to local DB file:", err);
  }
}

// Check if we should use local JSON database
const useLocalDB = !process.env.DATABASE_URL;
// When a real database is configured, NEVER fall back to the ephemeral local
// JSON file (it does not persist on serverless). Fail loudly instead.
const DB_CONFIGURED = !!process.env.DATABASE_URL;

export const db = {
  // --- USERS ---
  async findUserByEmail(email: string) {
    if (!useLocalDB) {
      try {
        return await prisma.user.findUnique({
          where: { email },
          include: { profile: true }
        });
      } catch (err) {
        console.warn("Prisma query failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const user = store.users.find((u: any) => u.email === email);
    if (!user) return null;
    const profile = store.profiles.find((p: any) => p.userId === user.id) || null;
    return { ...user, profile };
  },

  async findUserById(id: string) {
    if (!useLocalDB) {
      try {
        return await prisma.user.findUnique({
          where: { id },
          include: { profile: true }
        });
      } catch (err) {
        console.warn("Prisma query failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const user = store.users.find((u: any) => u.id === id);
    if (!user) return null;
    const profile = store.profiles.find((p: any) => p.userId === user.id) || null;
    return { ...user, profile };
  },

  async createUser(data: { id?: string; email: string; passwordHash?: string; role: "STUDENT" | "RECRUITER" }) {
    if (!useLocalDB) {
      try {
        return await prisma.user.create({
          data: {
            id: data.id,
            email: data.email,
            passwordHash: data.passwordHash,
            role: data.role
          }
        });
      } catch (err) {
        console.warn("Prisma create failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const newUser = {
      id: data.id || Math.random().toString(36).substring(2, 15),
      email: data.email,
      passwordHash: data.passwordHash || null,
      role: data.role,
      createdAt: new Date().toISOString()
    };
    store.users.push(newUser);
    saveLocalDB(store);
    return newUser;
  },

  // --- PROFILES ---
  async getProfileByUserId(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.profile.findUnique({ where: { userId } });
      } catch (err) {
        console.error("Prisma getProfileByUserId failed on production:", err);
        return null;
      }
    }
    const store = getLocalDB();
    return store.profiles.find((p: any) => p.userId === userId) || null;
  },

  async upsertProfile(userId: string, data: {
    fullName?: string;
    college?: string;
    branch?: string;
    graduationYear?: number;
    cgpa?: number;
    githubUsername?: string;
    targetRole?: string;
    skills?: string[];
  }) {
    if (!useLocalDB) {
      try {
        return await prisma.profile.upsert({
          where: { userId },
          update: data,
          create: { userId, ...data }
        });
      } catch (err) {
        console.error("Prisma upsertProfile failed on production:", err);
        throw err;
      }
    }
    const store = getLocalDB();
    let index = store.profiles.findIndex((p: any) => p.userId === userId);
    const now = new Date().toISOString();
    let profile;

    if (index !== -1) {
      profile = { ...store.profiles[index], ...data, updatedAt: now };
      store.profiles[index] = profile;
    } else {
      profile = {
        id: Math.random().toString(36).substring(2, 15),
        userId,
        fullName: data.fullName || null,
        college: data.college || null,
        branch: data.branch || null,
        graduationYear: data.graduationYear || null,
        cgpa: data.cgpa || null,
        githubUsername: data.githubUsername || null,
        targetRole: data.targetRole || null,
        skills: data.skills || [],
        studyHoursPerWeek: 10,
        updatedAt: now
      };
      store.profiles.push(profile);
    }
    saveLocalDB(store);
    return profile;
  },

  async updateProfile(userId: string, data: any) {
    if (!useLocalDB) {
      try {
        // If data contains onboardingCompleted, update it via raw query since it's not in the Prisma schema
        if ("onboardingCompleted" in data) {
          const { onboardingCompleted, ...rest } = data;
          try {
            await prisma.$executeRaw`
              UPDATE profiles 
              SET "onboardingCompleted" = ${onboardingCompleted} 
              WHERE "userId" = ${userId}
            `;
          } catch (rawErr) {
            console.warn("Raw SQL update of onboardingCompleted failed:", rawErr);
          }
          data = rest;
        }

        if (Object.keys(data).length > 0) {
          return await prisma.profile.update({
            where: { userId },
            data
          });
        } else {
          return await prisma.profile.findUnique({ where: { userId } });
        }
      } catch (err) {
        console.error("Prisma updateProfile failed on production:", err);
        return null;
      }
    }
    const store = getLocalDB();
    let index = store.profiles.findIndex((p: any) => p.userId === userId);
    if (index === -1) {
      return this.upsertProfile(userId, data);
    }
    const profile = { ...store.profiles[index], ...data, updatedAt: new Date().toISOString() };
    store.profiles[index] = profile;
    saveLocalDB(store);
    return profile;
  },

  async findManyProfiles(filters?: {
    college?: string;
    branch?: string;
    targetRole?: string;
    skills?: string[];
    minCgpa?: number;
  }) {
    if (!useLocalDB) {
      try {
        const whereClause: any = {};
        if (filters?.college) whereClause.college = { contains: filters.college, mode: "insensitive" };
        if (filters?.branch) whereClause.branch = { contains: filters.branch, mode: "insensitive" };
        if (filters?.targetRole) whereClause.targetRole = { contains: filters.targetRole, mode: "insensitive" };
        if (filters?.minCgpa) whereClause.cgpa = { gte: filters.minCgpa };
        if (filters?.skills && filters.skills.length > 0) {
          whereClause.skills = { hasSome: filters.skills };
        }
        
        return await prisma.profile.findMany({
          where: whereClause,
          include: {
            user: {
              include: {
                resumes: { orderBy: { createdAt: "desc" }, take: 1 },
                careerTwins: { orderBy: { createdAt: "desc" }, take: 1 }
              }
            }
          }
        });
      } catch (err) {
        console.warn("Prisma findManyProfiles failed, falling back to local JSON db:", err);
      }
    }

    const store = getLocalDB();
    return store.profiles.filter((p: any) => {
      if (filters?.college && (!p.college || !p.college.toLowerCase().includes(filters.college.toLowerCase()))) return false;
      if (filters?.branch && (!p.branch || !p.branch.toLowerCase().includes(filters.branch.toLowerCase()))) return false;
      if (filters?.targetRole && (!p.targetRole || !p.targetRole.toLowerCase().includes(filters.targetRole.toLowerCase()))) return false;
      if (filters?.minCgpa && (p.cgpa === null || p.cgpa < filters.minCgpa)) return false;
      if (filters?.skills && filters.skills.length > 0) {
        const hasSkill = filters.skills.some((s: string) => p.skills?.some((ps: string) => ps.toLowerCase() === s.toLowerCase()));
        if (!hasSkill) return false;
      }
      return true;
    }).map((p: any) => {
      const userObj = store.users.find((u: any) => u.id === p.userId);
      const userResumes = store.resume_analysis.filter((r: any) => r.userId === p.userId).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const userTwins = store.career_twins.filter((t: any) => t.userId === p.userId).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return {
        ...p,
        user: {
          ...userObj,
          resumes: userResumes.slice(0, 1),
          careerTwins: userTwins.slice(0, 1)
        }
      };
    });
  },

  // --- GITHUB & LINKEDIN OAUTH INTEGRATIONS ---
  async getGitHubAccountByUserId(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.gitHubAccount.findUnique({ where: { userId } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    return store.github_accounts.find((a: any) => a.userId === userId) || null;
  },

  async saveGitHubAccount(userId: string, data: { username: string; displayName?: string; avatarUrl?: string; email?: string; publicRepos?: number; privateRepos?: number }) {
    if (!useLocalDB) {
      try {
        return await prisma.gitHubAccount.upsert({
          where: { userId },
          update: data,
          create: { userId, ...data }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const idx = store.github_accounts.findIndex((a: any) => a.userId === userId);
    const account = { id: Math.random().toString(36).substring(2, 15), userId, ...data, updatedAt: new Date().toISOString() };
    if (idx !== -1) {
      store.github_accounts[idx] = { ...store.github_accounts[idx], ...data, updatedAt: new Date().toISOString() };
    } else {
      store.github_accounts.push(account);
    }
    saveLocalDB(store);
    return account;
  },

  async deleteGitHubAccount(userId: string) {
    if (!useLocalDB) {
      try {
        await prisma.gitHubAccount.delete({ where: { userId } }).catch(() => {});
        await prisma.oAuthToken.deleteMany({ where: { userId, provider: "github" } }).catch(() => {});
        await prisma.gitHubAnalysis.deleteMany({ where: { userId } }).catch(() => {});
      } catch (err) {
        console.warn("Prisma deleteGitHubAccount failed, falling back:", err);
      }
    }
    const store = getLocalDB();
    store.github_accounts = store.github_accounts.filter((a: any) => a.userId !== userId);
    store.oauth_tokens = store.oauth_tokens.filter((t: any) => !(t.userId === userId && t.provider === "github"));
    store.github_analysis = store.github_analysis.filter((a: any) => a.userId !== userId);
    saveLocalDB(store);
  },

  async getLinkedInAccountByUserId(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.linkedInAccount.findUnique({ where: { userId } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    return store.linkedin_accounts.find((a: any) => a.userId === userId) || null;
  },

  async saveLinkedInAccount(userId: string, data: any) {
    if (!useLocalDB) {
      try {
        return await prisma.linkedInAccount.upsert({
          where: { userId },
          update: data,
          create: { userId, ...data }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const idx = store.linkedin_accounts.findIndex((a: any) => a.userId === userId);
    const account = { id: Math.random().toString(36).substring(2, 15), userId, ...data, updatedAt: new Date().toISOString() };
    if (idx !== -1) {
      store.linkedin_accounts[idx] = { ...store.linkedin_accounts[idx], ...data, updatedAt: new Date().toISOString() };
    } else {
      store.linkedin_accounts.push(account);
    }
    saveLocalDB(store);
    return account;
  },

  async getOAuthToken(userId: string, provider: string) {
    if (!useLocalDB) {
      try {
        return await prisma.oAuthToken.findFirst({ where: { userId, provider } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    return store.oauth_tokens.find((t: any) => t.userId === userId && t.provider === provider) || null;
  },

  async saveOAuthToken(userId: string, provider: string, data: { accessToken: string; refreshToken?: string; expiresAt?: string; scopes?: string[] }) {
    if (!useLocalDB) {
      try {
        const existing = await prisma.oAuthToken.findFirst({ where: { userId, provider } });
        if (existing) {
          return await prisma.oAuthToken.update({
            where: { id: existing.id },
            data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }
          });
        }
        return await prisma.oAuthToken.create({
          data: {
            userId,
            provider,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || null,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            scopes: data.scopes || []
          }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const idx = store.oauth_tokens.findIndex((t: any) => t.userId === userId && t.provider === provider);
    const token = { id: Math.random().toString(36).substring(2, 15), userId, provider, ...data, updatedAt: new Date().toISOString() };
    if (idx !== -1) {
      store.oauth_tokens[idx] = { ...store.oauth_tokens[idx], ...data, updatedAt: new Date().toISOString() };
    } else {
      store.oauth_tokens.push(token);
    }
    saveLocalDB(store);
    return token;
  },

  // --- RESUMES ---
  async getLatestResumeByUserId(userId: string) {
    // For legacy compat (returns latest ResumeAnalysis mapping)
    return this.getLatestResumeAnalysis(userId);
  },

  async getLatestResumeFile(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.resumeFile.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const files = store.resume_files.filter((f: any) => f.userId === userId);
    if (files.length === 0) return null;
    return files.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  },

  async saveResumeFile(userId: string, data: { fileName: string; fileUrl: string; fileSize: number; fileType: string }) {
    if (!useLocalDB) {
      try {
        return await prisma.resumeFile.create({ data: { userId, ...data } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const file = { id: Math.random().toString(36).substring(2, 15), userId, ...data, createdAt: new Date().toISOString() };
    store.resume_files.push(file);
    saveLocalDB(store);
    return file;
  },

  async getLatestResumeAnalysis(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.resumeAnalysis.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const analyses = store.resume_analysis.filter((a: any) => a.userId === userId);
    if (analyses.length === 0) return null;
    return analyses.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  },

  async saveResumeAnalysis(userId: string, data: {
    resumeFileId?: string;
    atsScore: number;
    resumeScore: number;
    impactScore: number;
    technicalScore: number;
    formattingScore: number;
    grammarScore: number;
    weakBulletPoints: any;
    missingMetrics: any;
    duplicateContent: any;
    missingActionVerbs: any;
    suggestions: any;
  }) {
    if (!useLocalDB) {
      try {
        return await prisma.resumeAnalysis.create({ data: { userId, ...data } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const analysis = { id: Math.random().toString(36).substring(2, 15), userId, ...data, createdAt: new Date().toISOString() };
    store.resume_analysis.push(analysis);
    saveLocalDB(store);
    return analysis;
  },

  // Legacy createResume mapping
  async createResume(data: {
    userId: string;
    fileUrl: string;
    parsedContent: any;
    atsScore: number;
    placementProbability: number;
    weakAreas: string[];
    missingSkills: string[];
    suggestions: any;
  }) {
    // Map to normalized schema
    await this.saveResumeFile(data.userId, {
      fileName: path.basename(data.fileUrl) || "resume.pdf",
      fileUrl: data.fileUrl,
      fileSize: 102400,
      fileType: "application/pdf"
    });

    return this.saveResumeAnalysis(data.userId, {
      atsScore: data.atsScore,
      resumeScore: data.atsScore + 5,
      impactScore: Math.round(data.placementProbability),
      technicalScore: 78,
      formattingScore: 85,
      grammarScore: 90,
      weakBulletPoints: data.weakAreas,
      missingMetrics: ["No metrics in project bullet points"],
      duplicateContent: [],
      missingActionVerbs: [],
      suggestions: data.suggestions
    });
  },

  // --- GITHUB & LINKEDIN ANALYSIS ---
  async getLatestGitHubAnalysis(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.gitHubAnalysis.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const list = store.github_analysis.filter((a: any) => a.userId === userId);
    if (list.length === 0) return null;
    return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  },

  async saveGitHubAnalysis(userId: string, data: any) {
    if (!useLocalDB) {
      try {
        return await prisma.gitHubAnalysis.create({ data: { userId, ...data } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const analysis = { id: Math.random().toString(36).substring(2, 15), userId, ...data, createdAt: new Date().toISOString() };
    store.github_analysis.push(analysis);
    saveLocalDB(store);
    return analysis;
  },

  async getLatestLinkedInAnalysis(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.linkedInAnalysis.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const list = store.linkedin_analysis.filter((a: any) => a.userId === userId);
    if (list.length === 0) return null;
    return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  },

  async saveLinkedInAnalysis(userId: string, data: any) {
    if (!useLocalDB) {
      try {
        return await prisma.linkedInAnalysis.create({ data: { userId, ...data } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const analysis = { id: Math.random().toString(36).substring(2, 15), userId, ...data, createdAt: new Date().toISOString() };
    store.linkedin_analysis.push(analysis);
    saveLocalDB(store);
    return analysis;
  },

  // --- CAREER SCORES ---
  async getScoresByUserId(userId: string) {
    if (!useLocalDB) {
      try {
        const scores = await prisma.careerScore.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
        if (scores) {
          return {
            userId: scores.userId,
            resume: scores.resumeScore,
            github: scores.githubScore,
            projects: scores.portfolioScore,
            interview: scores.interviewReadiness,
            marketDemand: scores.hiringScore,
            skillsprintScore: scores.overallScore,
            history: (scores.details as any)?.history || []
          };
        }
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const scoreItem = store.career_scores.find((s: any) => s.userId === userId);
    if (scoreItem) {
      return {
        userId: scoreItem.userId,
        resume: scoreItem.resumeScore,
        github: scoreItem.githubScore,
        projects: scoreItem.portfolioScore,
        interview: scoreItem.interviewReadiness,
        marketDemand: scoreItem.hiringScore,
        skillsprintScore: scoreItem.overallScore,
        history: (scoreItem.details as any)?.history || []
      };
    }
    // Return default starter scores
    return {
      userId,
      resume: 72,
      github: 65,
      projects: 70,
      interview: 60,
      marketDemand: 75,
      skillsprintScore: 68,
      history: [
        { month: "April", score: 58 },
        { month: "May", score: 67 },
        { month: "June", score: 68 }
      ]
    };
  },

  async updateScores(userId: string, data: {
    resume?: number;
    github?: number;
    projects?: number;
    interview?: number;
    marketDemand?: number;
    skillsprintScore?: number;
    history?: any[];
  }) {
    const scoresData = {
      overallScore: data.skillsprintScore || 68,
      resumeScore: data.resume || 72,
      githubScore: data.github || 65,
      portfolioScore: data.projects || 70,
      interviewReadiness: data.interview || 60,
      hiringScore: data.marketDemand || 75,
      details: { history: data.history || [] }
    };

    if (!useLocalDB) {
      try {
        const existing = await prisma.careerScore.findFirst({ where: { userId } });
        if (existing) {
          await prisma.careerScore.update({
            where: { id: existing.id },
            data: { ...scoresData, updatedAt: new Date() }
          });
        } else {
          await prisma.careerScore.create({
            data: { userId, ...scoresData }
          });
        }
      } catch (err) {
        console.error(err);
      }
    }

    const store = getLocalDB();
    let index = store.career_scores.findIndex((s: any) => s.userId === userId);
    const existing = index !== -1 ? store.career_scores[index] : {
      userId,
      overallScore: 68,
      resumeScore: 72,
      githubScore: 65,
      portfolioScore: 70,
      interviewReadiness: 60,
      hiringScore: 75,
      details: {
        history: [
          { month: "April", score: 58 },
          { month: "May", score: 67 },
          { month: "June", score: 68 }
        ]
      }
    };

    const updated = {
      ...existing,
      overallScore: data.skillsprintScore !== undefined ? data.skillsprintScore : existing.overallScore,
      resumeScore: data.resume !== undefined ? data.resume : existing.resumeScore,
      githubScore: data.github !== undefined ? data.github : existing.githubScore,
      portfolioScore: data.projects !== undefined ? data.projects : existing.portfolioScore,
      interviewReadiness: data.interview !== undefined ? data.interview : existing.interviewReadiness,
      hiringScore: data.marketDemand !== undefined ? data.marketDemand : existing.hiringScore,
      details: {
        history: data.history || (existing.details as any)?.history || []
      },
      updatedAt: new Date().toISOString()
    };

    if (index !== -1) {
      store.career_scores[index] = updated;
    } else {
      store.career_scores.push(updated);
    }
    saveLocalDB(store);

    return {
      userId: updated.userId,
      resume: updated.resumeScore,
      github: updated.githubScore,
      projects: updated.portfolioScore,
      interview: updated.interviewReadiness,
      marketDemand: updated.hiringScore,
      skillsprintScore: updated.overallScore,
      history: (updated.details as any).history
    };
  },

  // --- CAREER TWINS ---
  async getLatestCareerTwin(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.careerTwin.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const twins = store.career_twins.filter((t: any) => t.userId === userId);
    if (twins.length === 0) return null;
    return twins.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  },

  async createCareerTwin(data: any) {
    if (!useLocalDB) {
      try {
        return await prisma.careerTwin.create({
          data: {
            userId: data.userId,
            currentSkills: data.currentSkills || [],
            strongSkills: data.strongSkills || [],
            weakSkills: data.weakSkills || [],
            preferredStack: data.preferredStack || [],
            careerGoal: data.careerGoal || "",
            dreamCompanies: data.dreamCompanies || [],
            prediction3m: data.prediction3m || null,
            prediction6m: data.prediction6m || null,
            prediction12m: data.prediction12m || null,
            salaryProjection: data.salaryProjection || "",
            riskFactors: data.riskFactors || [],
            growthOpportunities: data.growthOpportunities || null
          }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const newTwin = {
      id: Math.random().toString(36).substring(2, 15),
      ...data,
      createdAt: new Date().toISOString()
    };
    store.career_twins.push(newTwin);
    saveLocalDB(store);
    return newTwin;
  },

  // --- PROJECT RECOMMENDATIONS ---
  async getRecommendedProjects(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.recommendedProject.findMany({ where: { userId } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    return store.recommended_projects.filter((p: any) => p.userId === userId);
  },

  async saveRecommendedProjects(userId: string, projects: any[]) {
    if (!useLocalDB) {
      try {
        await prisma.recommendedProject.deleteMany({ where: { userId } });
        return await Promise.all(projects.map(p => prisma.recommendedProject.create({ data: { userId, ...p } })));
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    store.recommended_projects = store.recommended_projects.filter((p: any) => p.userId !== userId);
    const saved = projects.map(p => {
      const proj = { id: Math.random().toString(36).substring(2, 15), userId, ...p, createdAt: new Date().toISOString() };
      store.recommended_projects.push(proj);
      return proj;
    });
    saveLocalDB(store);
    return saved;
  },

  async clearRecommendedProjects(userId: string) {
    if (!useLocalDB) {
      try {
        await prisma.recommendedProject.deleteMany({ where: { userId } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    store.recommended_projects = store.recommended_projects.filter((p: any) => p.userId !== userId);
    saveLocalDB(store);
  },

  // --- ROADMAPS & PROGRESS ---
  async getLatestRoadmap(userId: string) {
    if (!useLocalDB) {
      try {
        const roadmap = await prisma.roadmap.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
          include: { progress: true }
        });
        if (roadmap) {
          const progress = roadmap.progress[0];
          const weeklyTasks = (roadmap.weeklyRoadmap as any[])?.map((w: any) => ({
            text: `Week ${w.week}: ${w.goal}`,
            completed: false
          })) || [];

          return {
            id: roadmap.id,
            userId: roadmap.userId,
            targetCompany: "Google", // Mock mapping compatibility
            targetRole: roadmap.projectName,
            dailyTasks: roadmap.dailyTasks || [],
            weeklyTasks,
            monthlyTasks: roadmap.milestones || [],
            completionPercentage: progress ? Math.round((progress.completedTasks.length / 12) * 100) : 0,
            architecture: roadmap.architecture,
            folderStructure: roadmap.folderStructure,
            databaseDesign: roadmap.databaseDesign,
            apiDesign: roadmap.apiDesign,
            authStrategy: roadmap.authStrategy,
            weeklyRoadmap: roadmap.weeklyRoadmap,
            resources: roadmap.resources,
            commonMistakes: roadmap.commonMistakes,
            expectedDeliverables: roadmap.expectedDeliverables,
            templates: roadmap.templates,
            interviewPrep: roadmap.interviewPrep
          };
        }
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const roadmaps = store.roadmaps.filter((r: any) => r.userId === userId);
    if (roadmaps.length === 0) return null;
    const latest = roadmaps.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const progress = store.learning_progress.find((p: any) => p.roadmapId === latest.id) || null;

    return {
      ...latest,
      targetCompany: "Google",
      targetRole: latest.projectName,
      completionPercentage: progress ? Math.round((progress.completedTasks.length / 12) * 100) : 0
    };
  },

  async createRoadmap(data: {
    userId: string;
    targetCompany?: string;
    targetRole?: string;
    dailyTasks: any;
    weeklyTasks: any;
    monthlyTasks?: any;
    completionPercentage: number;
    projectName?: string;
    architecture?: any;
    folderStructure?: any;
    databaseDesign?: any;
    apiDesign?: any;
    authStrategy?: any;
    weeklyRoadmap?: any;
    resources?: any;
    commonMistakes?: any;
    expectedDeliverables?: any;
    templates?: any;
    interviewPrep?: any;
  }) {
    const roadmapPayload = {
      projectName: data.projectName || data.targetRole || "Dynamic Project",
      architecture: data.architecture || {},
      folderStructure: data.folderStructure || {},
      databaseDesign: data.databaseDesign || {},
      apiDesign: data.apiDesign || {},
      authStrategy: data.authStrategy || {},
      weeklyRoadmap: data.weeklyRoadmap || {},
      dailyTasks: data.dailyTasks || [],
      milestones: data.monthlyTasks || [],
      resources: data.resources || {},
      commonMistakes: data.commonMistakes || [],
      expectedDeliverables: data.expectedDeliverables || [],
      templates: data.templates || {},
      interviewPrep: data.interviewPrep || {}
    };

    if (!useLocalDB) {
      try {
        const rm = await prisma.roadmap.create({
          data: { userId: data.userId, ...roadmapPayload }
        });
        await prisma.learningProgress.create({
          data: {
            userId: data.userId,
            roadmapId: rm.id,
            completedTasks: []
          }
        });
        return {
          id: rm.id,
          userId: rm.userId,
          targetCompany: "Google",
          targetRole: rm.projectName,
          dailyTasks: rm.dailyTasks,
          weeklyTasks: data.weeklyTasks || [],
          monthlyTasks: rm.milestones,
          completionPercentage: 0
        };
      } catch (err) {
        console.error(err);
      }
    }

    const store = getLocalDB();
    const rm = { id: Math.random().toString(36).substring(2, 15), userId: data.userId, ...roadmapPayload, createdAt: new Date().toISOString() };
    store.roadmaps.push(rm);

    const progress = {
      id: Math.random().toString(36).substring(2, 15),
      userId: data.userId,
      roadmapId: rm.id,
      completedTasks: [],
      updatedAt: new Date().toISOString()
    };
    store.learning_progress.push(progress);

    saveLocalDB(store);

    return {
      id: rm.id,
      userId: rm.userId,
      targetCompany: "Google",
      targetRole: rm.projectName,
      dailyTasks: rm.dailyTasks,
      weeklyTasks: rm.weeklyRoadmap,
      monthlyTasks: rm.milestones,
      completionPercentage: 0
    };
  },

  async updateRoadmap(id: string, data: any) {
    if (!useLocalDB) {
      try {
        const rm = await prisma.roadmap.update({
          where: { id },
          data: {
            dailyTasks: data.dailyTasks,
            milestones: data.monthlyTasks
          }
        });
        
        const prog = await prisma.learningProgress.findUnique({ where: { roadmapId: id } });
        if (prog) {
          const completedList = [
            ...(data.dailyTasks?.filter((t: any) => t.completed).map((t: any) => t.text) || []),
            ...(data.weeklyTasks?.filter((t: any) => t.completed).map((t: any) => t.text) || []),
            ...(data.monthlyTasks?.filter((t: any) => t.completed).map((t: any) => t.text) || [])
          ];
          await prisma.learningProgress.update({
            where: { id: prog.id },
            data: { completedTasks: completedList }
          });
        }

        return {
          id: rm.id,
          userId: rm.userId,
          targetCompany: "Google",
          targetRole: rm.projectName,
          dailyTasks: rm.dailyTasks,
          weeklyTasks: data.weeklyTasks || [],
          monthlyTasks: rm.milestones,
          completionPercentage: data.completionPercentage || 0
        };
      } catch (err) {
        console.error(err);
      }
    }

    const store = getLocalDB();
    const idx = store.roadmaps.findIndex((r: any) => r.id === id);
    if (idx === -1) return null;
    
    store.roadmaps[idx] = {
      ...store.roadmaps[idx],
      dailyTasks: data.dailyTasks || store.roadmaps[idx].dailyTasks,
      weeklyTasks: data.weeklyTasks || store.roadmaps[idx].weeklyTasks,
      milestones: data.monthlyTasks || store.roadmaps[idx].milestones
    };

    const progressIdx = store.learning_progress.findIndex((p: any) => p.roadmapId === id);
    if (progressIdx !== -1) {
      const completedList = [
        ...(data.dailyTasks?.filter((t: any) => t.completed).map((t: any) => t.text) || []),
        ...(data.weeklyTasks?.filter((t: any) => t.completed).map((t: any) => t.text) || []),
        ...(data.monthlyTasks?.filter((t: any) => t.completed).map((t: any) => t.text) || [])
      ];
      store.learning_progress[progressIdx].completedTasks = completedList;
      store.learning_progress[progressIdx].updatedAt = new Date().toISOString();
    }

    saveLocalDB(store);

    return {
      id: id,
      userId: store.roadmaps[idx].userId,
      targetCompany: "Google",
      targetRole: store.roadmaps[idx].projectName,
      dailyTasks: store.roadmaps[idx].dailyTasks,
      weeklyTasks: store.roadmaps[idx].weeklyTasks,
      monthlyTasks: store.roadmaps[idx].milestones,
      completionPercentage: data.completionPercentage || 0
    };
  },

  async getLearningProgress(roadmapId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.learningProgress.findUnique({ where: { roadmapId } });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    return store.learning_progress.find((p: any) => p.roadmapId === roadmapId) || null;
  },

  async saveLearningProgress(roadmapId: string, data: any) {
    if (!useLocalDB) {
      try {
        const existing = await prisma.learningProgress.findUnique({ where: { roadmapId } });
        if (existing) {
          return await prisma.learningProgress.update({ where: { id: existing.id }, data });
        }
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const idx = store.learning_progress.findIndex((p: any) => p.roadmapId === roadmapId);
    const prog = { id: Math.random().toString(36).substring(2, 15), roadmapId, ...data, updatedAt: new Date().toISOString() };
    if (idx !== -1) {
      store.learning_progress[idx] = { ...store.learning_progress[idx], ...data, updatedAt: new Date().toISOString() };
    } else {
      store.learning_progress.push(prog);
    }
    saveLocalDB(store);
    return prog;
  },

  // --- MOCK INTERVIEWS (MENTOR SESSIONS) ---
  async getInterviewsByUserId(userId: string) {
    if (!useLocalDB) {
      try {
        const sessions = await prisma.mentorSession.findMany({
          where: { userId, sessionType: "Mock Interview" },
          orderBy: { createdAt: "desc" }
        });
        return sessions.map((s: any) => ({
          id: s.id,
          userId: s.userId,
          mode: "Voice Conversation",
          transcript: s.transcripts,
          communicationScore: (s.feedback as any)?.communicationScore || 75,
          confidenceScore: (s.feedback as any)?.confidenceScore || 75,
          technicalScore: (s.feedback as any)?.technicalScore || 75,
          leadershipScore: (s.feedback as any)?.leadershipScore || 75,
          overallScore: (s.feedback as any)?.overallScore || 75,
          improvementSuggestions: (s.feedback as any)?.suggestions || [],
          createdAt: s.createdAt
        }));
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    return store.mentor_sessions
      .filter((s: any) => s.userId === userId && s.sessionType === "Mock Interview")
      .map((s: any) => ({
        id: s.id,
        userId: s.userId,
        mode: "Voice Conversation",
        transcript: s.transcripts,
        communicationScore: (s.feedback as any)?.communicationScore || 75,
        confidenceScore: (s.feedback as any)?.confidenceScore || 75,
        technicalScore: (s.feedback as any)?.technicalScore || 75,
        leadershipScore: (s.feedback as any)?.leadershipScore || 75,
        overallScore: (s.feedback as any)?.overallScore || 75,
        improvementSuggestions: (s.feedback as any)?.suggestions || [],
        createdAt: s.createdAt
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createInterview(data: {
    userId: string;
    mode: string;
    transcript: any;
    communicationScore: number;
    confidenceScore: number;
    technicalScore: number;
    leadershipScore: number;
    overallScore: number;
    improvementSuggestions: string[];
  }) {
    const feedback = {
      communicationScore: data.communicationScore,
      confidenceScore: data.confidenceScore,
      technicalScore: data.technicalScore,
      leadershipScore: data.leadershipScore,
      overallScore: data.overallScore,
      suggestions: data.improvementSuggestions
    };

    if (!useLocalDB) {
      try {
        const session = await prisma.mentorSession.create({
          data: {
            userId: data.userId,
            sessionType: "Mock Interview",
            transcripts: data.transcript,
            feedback: feedback
          }
        });
        return {
          ...data,
          id: session.id,
          mode: data.mode,
          transcript: session.transcripts,
          createdAt: session.createdAt
        };
      } catch (err) {
        console.error(err);
      }
    }

    const store = getLocalDB();
    const session = {
      id: Math.random().toString(36).substring(2, 15),
      userId: data.userId,
      sessionType: "Mock Interview",
      transcripts: data.transcript,
      feedback: feedback,
      createdAt: new Date().toISOString()
    };
    store.mentor_sessions.push(session);
    saveLocalDB(store);

    return {
      ...data,
      id: session.id,
      mode: data.mode,
      transcript: session.transcripts,
      createdAt: session.createdAt
    };
  },

  // --- PORTFOLIOS (LEGACY FALLBACK COMPATIBILITY) ---
  async getPortfolioAudit(userId: string) {
    try {
      const store = getLocalDB();
      return store.portfolios.find((p: any) => p.userId === userId) || null;
    } catch {
      return null;
    }
  },

  async savePortfolioAudit(userId: string, data: any) {
    try {
      const store = getLocalDB();
      let index = store.portfolios.findIndex((p: any) => p.userId === userId);
      const audit = {
        id: Math.random().toString(36).substring(2, 15),
        userId,
        ...data,
        createdAt: new Date().toISOString()
      };
      if (index !== -1) {
        store.portfolios[index] = audit;
      } else {
        store.portfolios.push(audit);
      }
      saveLocalDB(store);
      return audit;
    } catch {
      return null;
    }
  },

  // --- HACKATHONS (LEGACY COMPATIBILITY) ---
  async getHackathonsByUserId(userId: string) {
    try {
      const store = getLocalDB();
      const list = store.hackathons.filter((h: any) => h.userId === userId);
      if (list.length > 0) return list;
    } catch {
      // Local JSON DB disabled in production — fall through to defaults.
    }
    return [
      { id: "h1", userId, title: "Smart India Hackathon 2026", matchScore: 92, platform: "Govt of India", skills: ["React", "SQL", "Cloud"] },
      { id: "h2", userId, title: "Co:here AI Hackathon", matchScore: 84, platform: "Lablab.ai", skills: ["Next.js", "Python", "API Design"] },
      { id: "h3", userId, title: "Vercel Web Buildathon", matchScore: 78, platform: "Devpost", skills: ["Next.js", "TypeScript", "Tailwind"] }
    ];
  },

  async saveHackathons(userId: string, hackathons: any[]) {
    const store = getLocalDB();
    store.hackathons = store.hackathons.filter((h: any) => h.userId !== userId);
    hackathons.forEach(h => {
      store.hackathons.push({ id: Math.random().toString(36).substring(2, 15), userId, ...h });
    });
    saveLocalDB(store);
    return hackathons;
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    return store.notifications.filter((n: any) => n.userId === userId).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createNotification(userId: string, data: { title: string; message: string }) {
    if (!useLocalDB) {
      try {
        return await prisma.notification.create({
          data: { userId, title: data.title, message: data.message }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const notif = {
      id: Math.random().toString(36).substring(2, 15),
      userId,
      title: data.title,
      message: data.message,
      read: false,
      createdAt: new Date().toISOString()
    };
    store.notifications.push(notif);
    saveLocalDB(store);
    return notif;
  },

  async markNotificationRead(id: string) {
    if (!useLocalDB) {
      try {
        return await prisma.notification.update({
          where: { id },
          data: { read: true }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const idx = store.notifications.findIndex((n: any) => n.id === id);
    if (idx !== -1) {
      store.notifications[idx].read = true;
    }
    saveLocalDB(store);
    return idx !== -1 ? store.notifications[idx] : null;
  },

  // --- ACTIVITY LOGS ---
  async createActivityLog(data: { userId: string; action: string; details: any }) {
    if (!useLocalDB) {
      try {
        return await prisma.activityLog.create({
          data: {
            userId: data.userId,
            action: data.action,
            details: data.details
          }
        });
      } catch (err) {
        console.warn("Prisma createActivityLog failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const newLog = {
      id: Math.random().toString(36).substring(2, 15),
      userId: data.userId,
      action: data.action,
      details: data.details || {},
      timestamp: new Date().toISOString()
    };
    store.activity_logs.push(newLog);
    saveLocalDB(store);
    return newLog;
  },

  // --- SYNC HISTORY ---
  async getSyncHistory(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.syncHistory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    return store.sync_history.filter((s: any) => s.userId === userId).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createSyncHistory(userId: string, data: { provider: string; status: string; details?: any }) {
    if (!useLocalDB) {
      try {
        return await prisma.syncHistory.create({
          data: { userId, provider: data.provider, status: data.status, details: data.details || {} }
        });
      } catch (err) {
        console.error(err);
      }
    }
    const store = getLocalDB();
    const sync = {
      id: Math.random().toString(36).substring(2, 15),
      userId,
      provider: data.provider,
      status: data.status,
      details: data.details || {},
      createdAt: new Date().toISOString()
    };
    store.sync_history.push(sync);
    saveLocalDB(store);
    return sync;
  },

  async migrateUserId(oldId: string, newId: string) {
    if (!useLocalDB) {
      try {
        console.log(`[db] Starting Prisma migrateUserId transaction from "${oldId}" to "${newId}"`);
        await prisma.$transaction(async (tx) => {
          const oldUser = await tx.user.findUnique({ where: { id: oldId } });
          if (!oldUser) return;

          const existingNewUser = await tx.user.findUnique({ where: { id: newId } });
          if (!existingNewUser) {
            await tx.user.create({
              data: {
                id: newId,
                email: oldUser.email,
                passwordHash: oldUser.passwordHash,
                role: oldUser.role,
                createdAt: oldUser.createdAt,
              }
            });
          }

          // Update relations
          await tx.profile.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.gitHubAccount.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.linkedInAccount.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.oAuthToken.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.resumeFile.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.resumeAnalysis.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.gitHubAnalysis.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.linkedInAnalysis.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.careerScore.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.careerTwin.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.recommendedProject.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.roadmap.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.learningProgress.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.activityLog.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.mentorSession.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.notification.updateMany({ where: { userId: oldId }, data: { userId: newId } });
          await tx.syncHistory.updateMany({ where: { userId: oldId }, data: { userId: newId } });

          await tx.user.delete({ where: { id: oldId } });
        });
      } catch (err) {
        console.error(`[db] Prisma migrateUserId failed:`, err);
      }
    }

    try {
      const store = getLocalDB();
      const userIndex = store.users.findIndex((u: any) => u.id === oldId);
      if (userIndex !== -1) {
        const oldUser = store.users[userIndex];
        store.users.splice(userIndex, 1);

        if (!store.users.some((u: any) => u.id === newId)) {
          store.users.push({ ...oldUser, id: newId });
        }

        const relationKeys = [
          "profiles", "github_accounts", "linkedin_accounts", "oauth_tokens",
          "resume_files", "resume_analysis", "github_analysis", "linkedin_analysis",
          "career_scores", "career_twins", "recommended_projects", "roadmaps",
          "learning_progress", "activity_logs", "mentor_sessions", "notifications",
          "sync_history", "portfolios", "hackathons"
        ];
        
        relationKeys.forEach((key: string) => {
          store[key].forEach((item: any) => {
            if (item.userId === oldId) item.userId = newId;
          });
        });

        saveLocalDB(store);
      }
    } catch (err) {
      console.error(err);
    }
  }
};
