export type TargetCompany = 
  | "Google" 
  | "Microsoft" 
  | "Amazon" 
  | "Meta" 
  | "Adobe" 
  | "Atlassian" 
  | "TCS" 
  | "Infosys" 
  | "Wipro" 
  | "Startup" 
  | "Product Company" 
  | string;

export type TargetRole = 
  | "Frontend Developer" 
  | "Backend Developer" 
  | "Full Stack Developer" 
  | "AI Engineer" 
  | "Cybersecurity Engineer" 
  | "DevOps Engineer" 
  | "Data Analyst" 
  | "Mobile Developer" 
  | "UI/UX Designer" 
  | string;

export type InterviewType = 
  | "Technical" 
  | "HR" 
  | "DSA" 
  | "System Design" 
  | "Behavioral" 
  | "Mixed";

export type InterviewDifficulty = 
  | "Beginner" 
  | "Intermediate" 
  | "Advanced" 
  | "Company Level";

export type QuestionCount = 5 | 10 | 20 | 30;

export type QuestionKind = 
  | "MCQ" 
  | "Coding" 
  | "Scenario" 
  | "Behavioral" 
  | "SystemDesign" 
  | "Architecture" 
  | "ResumeDiscussion" 
  | "ProjectDiscussion" 
  | "RapidFire" 
  | "Debugging" 
  | "CodeReading";

export type InterviewSetupConfig = {
  company: TargetCompany;
  role: TargetRole;
  type: InterviewType;
  difficulty: InterviewDifficulty;
  questionCount: number;
};

export type MCQOption = {
  id: string;
  text: string;
};

export type AdaptiveQuestion = {
  id: string;
  kind: QuestionKind;
  question: string;
  contextNote?: string; // E.g. "Referencing your SkillSprint AI Next.js App Router experience"
  initialCode?: string;
  codeLanguage?: string;
  mcqOptions?: MCQOption[];
  correctMCQOptionId?: string;
  expectedKeyConcepts?: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  hint?: string;
};

export type SingleTurnEvaluation = {
  questionId: string;
  userAnswer: string;
  correctnessScore: number; // 0-100
  communicationScore: number; // 0-100
  problemSolvingScore: number; // 0-100
  architectureThinkingScore: number; // 0-100
  feedback: string;
  idealAnswerKeyPoints: string[];
  suggestedNextDifficulty: "Easy" | "Medium" | "Hard";
};

export type RemedialTask = {
  type: "Daily" | "Weekly" | "Project" | "DSA" | "Article" | "Video";
  title: string;
  description: string;
  targetSkill: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

export type ComprehensiveInterviewReport = {
  id: string;
  userId: string;
  config: InterviewSetupConfig;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  behavioralScore: number;
  architectureScore: number;
  systemDesignScore: number;
  problemSolvingScore: number;
  timeTakenSeconds: number;
  answerQualitySummary: string;
  strengths: string[];
  weakAreas: string[];
  repeatedMistakes: string[];
  topicsToRevise: string[];
  interviewReadinessPercent: number;
  expectedPlacementReadiness: "High" | "Moderate" | "Needs Improvement";
  estimatedInterviewLevel: string;
  remedialPlan: RemedialTask[];
  transcript: {
    question: AdaptiveQuestion;
    userAnswer: string;
    evaluation: SingleTurnEvaluation;
  }[];
  createdAt: string;
};

export type HistoricalInterviewTrend = {
  id: string;
  createdAt: string;
  company: string;
  role: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  problemSolvingScore: number;
};
