import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

// Define the file path for local fallback database
const DB_FILE = path.join(process.cwd(), "prisma", "db.json");

// Helper to initialize the local JSON database if not exists
function getLocalDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      profiles: [],
      resumes: [],
      careerTwins: [],
      interviews: [],
      learningRoadmaps: [],
      activityLogs: [],
      scores: [],
      portfolios: [],
      hackathons: []
    };
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data || "{}");
  } catch (err) {
    return {
      users: [],
      profiles: [],
      resumes: [],
      careerTwins: [],
      interviews: [],
      learningRoadmaps: [],
      activityLogs: [],
      scores: [],
      portfolios: [],
      hackathons: []
    };
  }
}

function saveLocalDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to local DB file:", err);
  }
}

// Check if we should use local JSON database
const useLocalDB = !process.env.DATABASE_URL;

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
        console.warn("Prisma getProfileByUserId failed, falling back to local JSON db:", err);
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
        console.warn("Prisma upsertProfile failed, falling back to local JSON db:", err);
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
        return await prisma.profile.update({
          where: { userId },
          data
        });
      } catch (err) {
        console.warn("Prisma updateProfile failed, falling back to local JSON db:", err);
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
      const userResumes = store.resumes.filter((r: any) => r.userId === p.userId).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const userTwins = store.careerTwins.filter((t: any) => t.userId === p.userId).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
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

  // --- RESUMES ---
  async getLatestResumeByUserId(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.resume.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.warn("Prisma getLatestResumeByUserId failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const resumes = store.resumes.filter((r: any) => r.userId === userId);
    if (resumes.length === 0) return null;
    return resumes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  },

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
    if (!useLocalDB) {
      try {
        return await prisma.resume.create({ data });
      } catch (err) {
        console.warn("Prisma createResume failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const newResume = {
      id: Math.random().toString(36).substring(2, 15),
      ...data,
      createdAt: new Date().toISOString()
    };
    store.resumes.push(newResume);
    saveLocalDB(store);
    return newResume;
  },

  async updateResume(id: string, data: any) {
    if (!useLocalDB) {
      try {
        return await prisma.resume.update({
          where: { id },
          data
        });
      } catch (err) {
        console.warn("Prisma updateResume failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const index = store.resumes.findIndex((r: any) => r.id === id);
    if (index === -1) return null;
    const updated = { ...store.resumes[index], ...data };
    store.resumes[index] = updated;
    saveLocalDB(store);
    return updated;
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
        console.warn("Prisma getLatestCareerTwin failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const twins = store.careerTwins.filter((t: any) => t.userId === userId);
    if (twins.length === 0) return null;
    return twins.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  },

  async createCareerTwin(data: {
    userId: string;
    prediction3m: any;
    prediction6m: any;
    prediction12m: any;
    salaryProjection: string;
    riskFactors: string[];
    growthOpportunities: any;
  }) {
    if (!useLocalDB) {
      try {
        return await prisma.careerTwin.create({ data });
      } catch (err) {
        console.warn("Prisma createCareerTwin failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const newTwin = {
      id: Math.random().toString(36).substring(2, 15),
      ...data,
      createdAt: new Date().toISOString()
    };
    store.careerTwins.push(newTwin);
    saveLocalDB(store);
    return newTwin;
  },

  // --- LEARNING ROADMAPS ---
  async getLatestRoadmap(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.learningRoadmap.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.warn("Prisma getLatestRoadmap failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const roadmaps = store.learningRoadmaps.filter((r: any) => r.userId === userId);
    if (roadmaps.length === 0) return null;
    return roadmaps.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  },

  async createRoadmap(data: {
    userId: string;
    targetCompany: string;
    targetRole: string;
    dailyTasks: any;
    weeklyTasks: any;
    monthlyTasks: any;
    completionPercentage: number;
  }) {
    if (!useLocalDB) {
      try {
        return await prisma.learningRoadmap.create({ data });
      } catch (err) {
        console.warn("Prisma createRoadmap failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const newRoadmap = {
      id: Math.random().toString(36).substring(2, 15),
      ...data,
      createdAt: new Date().toISOString()
    };
    store.learningRoadmaps.push(newRoadmap);
    saveLocalDB(store);
    return newRoadmap;
  },

  async updateRoadmap(id: string, data: { completionPercentage?: number; dailyTasks?: any; weeklyTasks?: any; monthlyTasks?: any }) {
    if (!useLocalDB) {
      try {
        return await prisma.learningRoadmap.update({
          where: { id },
          data
        });
      } catch (err) {
        console.warn("Prisma updateRoadmap failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const index = store.learningRoadmaps.findIndex((r: any) => r.id === id);
    if (index === -1) return null;
    const updated = { ...store.learningRoadmaps[index], ...data };
    store.learningRoadmaps[index] = updated;
    saveLocalDB(store);
    return updated;
  },

  // --- INTERVIEWS ---
  async getInterviewsByUserId(userId: string) {
    if (!useLocalDB) {
      try {
        return await prisma.interview.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.warn("Prisma getInterviewsByUserId failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    return store.interviews.filter((i: any) => i.userId === userId).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    if (!useLocalDB) {
      try {
        return await prisma.interview.create({ data });
      } catch (err) {
        console.warn("Prisma createInterview failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const newInterview = {
      id: Math.random().toString(36).substring(2, 15),
      ...data,
      createdAt: new Date().toISOString()
    };
    store.interviews.push(newInterview);
    saveLocalDB(store);
    return newInterview;
  },

  // --- ACTIVITY LOGS ---
  async createActivityLog(data: { userId: string; action: string; details: any }) {
    if (!useLocalDB) {
      try {
        return await prisma.activityLog.create({ data });
      } catch (err) {
        console.warn("Prisma createActivityLog failed, falling back to local JSON db:", err);
      }
    }
    const store = getLocalDB();
    const newLog = {
      id: Math.random().toString(36).substring(2, 15),
      ...data,
      createdAt: new Date().toISOString()
    };
    store.activityLogs.push(newLog);
    saveLocalDB(store);
    return newLog;
  },

  // --- SCORE TELEMETRY & VELOCITY ---
  async getScoresByUserId(userId: string) {
    const store = getLocalDB();
    const scoreItem = store.scores.find((s: any) => s.userId === userId);
    if (scoreItem) return scoreItem;
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
    const store = getLocalDB();
    let index = store.scores.findIndex((s: any) => s.userId === userId);
    const existing = index !== -1 ? store.scores[index] : {
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

    const updated = { ...existing, ...data };
    if (index !== -1) {
      store.scores[index] = updated;
    } else {
      store.scores.push(updated);
    }
    saveLocalDB(store);
    return updated;
  },

  // --- PORTFOLIO ANALYSIS ---
  async getPortfolioAudit(userId: string) {
    const store = getLocalDB();
    return store.portfolios.find((p: any) => p.userId === userId) || null;
  },

  async savePortfolioAudit(userId: string, data: {
    portfolioUrl: string;
    designScore: number;
    performanceScore: number;
    seoScore: number;
    suggestions: string[];
  }) {
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
  },

  // --- HACKATHONS MATCHING ---
  async getHackathonsByUserId(userId: string) {
    const store = getLocalDB();
    const list = store.hackathons.filter((h: any) => h.userId === userId);
    if (list.length > 0) return list;
    
    // Return custom mock list matching standard profiles
    return [
      { id: "h1", userId, title: "Smart India Hackathon 2026", matchScore: 92, platform: "Govt of India", skills: ["React", "SQL", "Cloud"] },
      { id: "h2", userId, title: "Co:here AI Hackathon", matchScore: 84, platform: "Lablab.ai", skills: ["Next.js", "Python", "API Design"] },
      { id: "h3", userId, title: "Vercel Web Buildathon", matchScore: 78, platform: "Devpost", skills: ["Next.js", "TypeScript", "Tailwind"] }
    ];
  },

  async saveHackathons(userId: string, hackathons: any[]) {
    const store = getLocalDB();
    // remove existing ones for user
    store.hackathons = store.hackathons.filter((h: any) => h.userId !== userId);
    hackathons.forEach(h => {
      store.hackathons.push({ id: Math.random().toString(36).substring(2, 15), userId, ...h });
    });
    saveLocalDB(store);
    return hackathons;
  },

  async migrateUserId(oldId: string, newId: string) {
    if (!useLocalDB) {
      try {
        console.log(`[db] Starting Prisma migrateUserId transaction from "${oldId}" to "${newId}"`);
        await prisma.$transaction(async (tx) => {
          const oldUser = await tx.user.findUnique({ where: { id: oldId } });
          if (!oldUser) {
            console.log(`[db] Old user "${oldId}" not found in PostgreSQL. Aborting migration.`);
            return;
          }

          // Check if new user already exists
          const existingNewUser = await tx.user.findUnique({ where: { id: newId } });
          if (!existingNewUser) {
            console.log(`[db] Creating new user record with ID: "${newId}"`);
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

          console.log(`[db] Migrating relational tables from "${oldId}" to "${newId}"`);
          // Update relations
          await tx.profile.updateMany({
            where: { userId: oldId },
            data: { userId: newId }
          });
          await tx.resume.updateMany({
            where: { userId: oldId },
            data: { userId: newId }
          });
          await tx.careerTwin.updateMany({
            where: { userId: oldId },
            data: { userId: newId }
          });
          await tx.interview.updateMany({
            where: { userId: oldId },
            data: { userId: newId }
          });
          await tx.learningRoadmap.updateMany({
            where: { userId: oldId },
            data: { userId: newId }
          });
          await tx.activityLog.updateMany({
            where: { userId: oldId },
            data: { userId: newId }
          });

          // Delete old user
          console.log(`[db] Deleting old user record "${oldId}"`);
          await tx.user.delete({ where: { id: oldId } });
        });
        console.log(`[db] Prisma migrateUserId transaction from "${oldId}" to "${newId}" completed successfully.`);
      } catch (err) {
        console.error(`[db] Prisma migrateUserId failed, falling back to local JSON db:`, err);
      }
    }

    // Always update the local JSON db in case we are running local or fell back
    try {
      console.log(`[db] Migrating local JSON DB from "${oldId}" to "${newId}"`);
      const store = getLocalDB();
      const userIndex = store.users.findIndex((u: any) => u.id === oldId);
      if (userIndex !== -1) {
        const oldUser = store.users[userIndex];
        
        // Remove old user
        store.users.splice(userIndex, 1);

        // Add new user if not already exists
        if (!store.users.some((u: any) => u.id === newId)) {
          store.users.push({
            ...oldUser,
            id: newId,
          });
        }

        // Migrate profiles
        store.profiles.forEach((p: any) => {
          if (p.userId === oldId) p.userId = newId;
        });

        // Migrate resumes
        store.resumes.forEach((r: any) => {
          if (r.userId === oldId) r.userId = newId;
        });

        // Migrate careerTwins
        store.careerTwins.forEach((c: any) => {
          if (c.userId === oldId) c.userId = newId;
        });

        // Migrate learningRoadmaps
        store.learningRoadmaps.forEach((l: any) => {
          if (l.userId === oldId) l.userId = newId;
        });

        // Migrate interviews
        store.interviews.forEach((i: any) => {
          if (i.userId === oldId) i.userId = newId;
        });

        // Migrate activityLogs
        store.activityLogs.forEach((a: any) => {
          if (a.userId === oldId) a.userId = newId;
        });

        // Migrate scores
        store.scores.forEach((s: any) => {
          if (s.userId === oldId) s.userId = newId;
        });

        // Migrate portfolios
        store.portfolios.forEach((p: any) => {
          if (p.userId === oldId) p.userId = newId;
        });

        // Migrate hackathons
        store.hackathons.forEach((h: any) => {
          if (h.userId === oldId) h.userId = newId;
        });

        saveLocalDB(store);
        console.log(`[db] Local JSON DB migration from "${oldId}" to "${newId}" completed successfully.`);
      } else {
        console.log(`[db] User "${oldId}" not found in local JSON DB users list.`);
      }
    } catch (err) {
      console.error(`[db] Local JSON migrateUserId failed:`, err);
    }
  }
};
