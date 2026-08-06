// src/lib/candidateData.ts
// 250 realistic dummy tech candidates for the AI Shortlisting demo

export interface Candidate {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string; // Preferred Role
  skills: string[];
  experience: number; // Years
  education: { degree: string; college: string; year: number };
  cgpa: number; // CGPA (6.0 - 10.0)
  company: string; // Current Company
  resumeScore: number;
  atsScore: number;
  certifications: string[];
  github: string; // GitHub URL
  linkedin: string; // LinkedIn URL
  portfolio: string;
  projects: { name: string; tech: string; description: string }[];
  summary: string;
  expectedSalary: string;
  employmentType: string;
  workMode: string;
  noticePeriod: string; // Availability
}

const firstNames = [
  "Aarav","Priya","Rohan","Aisha","Vikram","Neha","Arjun","Divya","Kiran","Sanya",
  "Ravi","Meera","Ankit","Pooja","Rahul","Shreya","Amit","Kavya","Dev","Nisha",
  "Suresh","Lakshmi","Ajay","Rekha","Nikhil","Sunita","Varun","Geeta","Raj","Uma",
  "Siddharth","Tanya","Abhishek","Pallavi","Yogesh","Smita","Manish","Jyoti","Tarun","Ritu",
  "Pavan","Ankita","Harish","Swati","Deepak","Shweta","Vinay","Preeti","Ganesh","Komal",
  "James","Emily","Michael","Sarah","David","Jessica","Daniel","Ashley","Chris","Amanda",
  "Ryan","Megan","Josh","Lauren","Eric","Hannah","Kyle","Brittany","Tyler","Kayla",
  "Aaron","Nicole","Brandon","Stephanie","Adam","Rachel","Nathan","Samantha","Kevin","Heather",
  "Liang","Mei","Wei","Xiao","Yuki","Hana","Jin","Soo","Min","Ji",
  "Aryan","Ishaan","Kabir","Zara","Ayaan","Mia","Omar","Leila","Tariq","Fatima",
  "Santiago","Valentina","Mateo","Isabella","Sebastian","Camila","Alejandro","Sofia","Carlos","Lucia"
];

const lastNames = [
  "Sharma","Patel","Kumar","Singh","Mehta","Gupta","Nair","Reddy","Iyer","Joshi",
  "Chopra","Malhotra","Verma","Shah","Das","Roy","Bose","Sen","Ghosh","Mukherjee",
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Moore",
  "Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson","Lee","Walker",
  "Zhang","Li","Wang","Chen","Liu","Yang","Huang","Zhao","Wu","Sun",
  "Tanaka","Watanabe","Ito","Suzuki","Sato","Kim","Park","Choi","Yoon","Hwang",
  "Martinez","Lopez","Hernandez","Gonzalez","Rodriguez","Perez","Torres","Flores","Rivera","Ramirez",
  "Hassan","Ali","Khan","Ahmed","Malik","Qureshi","Ansari","Siddiqui","Sheikh","Chaudhary"
];

const colleges = [
  "IIT Bombay","IIT Delhi","IIT Madras","IIT Kanpur","IIT Kharagpur","IIT Roorkee",
  "BITS Pilani","BITS Goa","NIT Trichy","NIT Warangal","NIT Surathkal","NIT Calicut",
  "VIT Vellore","SRM University","Manipal Institute","Amity University","DTU Delhi","IIIT Hyderabad",
  "IIIT Bangalore","IISc Bangalore","Anna University","Pune University","Mumbai University",
  "Stanford University","MIT","Carnegie Mellon","UC Berkeley","University of Toronto","NUS Singapore",
  "University of Michigan","Georgia Tech","Caltech","Cornell University","Columbia University",
  "IIM Ahmedabad","XLRI Jamshedpur","ISB Hyderabad"
];

const degrees = ["B.Tech","B.E.","M.Tech","M.S.","M.Sc","BCA","MCA","B.Sc","MBA","Ph.D"];
const locations = [
  "Bangalore, India","Mumbai, India","Delhi, India","Hyderabad, India","Chennai, India",
  "Pune, India","Kolkata, India","Ahmedabad, India","Jaipur, India","Kochi, India",
  "San Francisco, USA","New York, USA","Seattle, USA","Austin, USA","Boston, USA",
  "London, UK","Berlin, Germany","Toronto, Canada","Singapore","Dubai, UAE"
];
const workModes = ["Remote","Hybrid","Onsite"];
const employmentTypes = ["Full-time","Contract","Part-time"];
const noticePeriods = ["Immediate","15 days","30 days","60 days","90 days"];
const salaryRanges = [
  "Fresher","Rs 4-8 LPA","Rs 8-15 LPA","Rs 15-25 LPA","Rs 25-40 LPA","Rs 40-60 LPA","Rs 60+ LPA"
];
const companies = [
  "TCS","Infosys","Wipro","Cognizant","Google","Amazon","Microsoft","Flipkart",
  "Razorpay","Swiggy","Zomato","Jio","Airtel","HCLTech","Tech Mahindra","Capgemini"
];

const allSkillPools: Record<string, string[]> = {
  "Frontend Developer": ["React","TypeScript","Next.js","Tailwind CSS","GraphQL","Redux","Webpack","Storybook","CSS3","HTML5","Jest","Figma","Vue.js","Angular","SASS"],
  "Backend Developer": ["Node.js","Python","Java","Go","REST API","GraphQL","PostgreSQL","MongoDB","Redis","Docker","Kubernetes","AWS","Microservices","Spring Boot","FastAPI"],
  "Full Stack Developer": ["React","Node.js","TypeScript","PostgreSQL","MongoDB","Docker","AWS","Next.js","GraphQL","Redis","Tailwind CSS","Python","REST API","CI/CD","Git"],
  "ML Engineer": ["Python","TensorFlow","PyTorch","Scikit-learn","NLP","Computer Vision","MLflow","Hugging Face","Pandas","NumPy","SQL","Spark","Kafka","AWS SageMaker","LangChain"],
  "Data Scientist": ["Python","R","SQL","Tableau","Power BI","Machine Learning","Statistics","Pandas","NumPy","Scikit-learn","Spark","Airflow","dbt","A/B Testing","Data Visualization"],
  "DevOps Engineer": ["Docker","Kubernetes","Terraform","Ansible","Jenkins","CI/CD","AWS","GCP","Azure","Linux","Bash","Prometheus","Grafana","GitOps","Helm"],
  "Data Engineer": ["Python","Spark","Kafka","Airflow","SQL","dbt","Snowflake","AWS","GCP","BigQuery","Redshift","ETL","Scala","Hadoop","Delta Lake"],
  "Cloud Architect": ["AWS","Azure","GCP","Terraform","Kubernetes","Microservices","Security","Networking","CDN","Serverless","Cost Optimization","IAM","VPC","Load Balancing","Multi-cloud"],
  "Product Manager": ["Product Strategy","Roadmapping","Agile","JIRA","User Research","A/B Testing","SQL","Figma","OKRs","Stakeholder Management","Go-to-Market","Analytics","PRDs","Prioritization","Market Research"],
  "Mobile Developer": ["React Native","Flutter","Swift","Kotlin","iOS","Android","Firebase","REST API","GraphQL","Redux","MobX","Expo","Xcode","Android Studio","TypeScript"],
};

const certificationPool: Record<string, string[]> = {
  "Frontend Developer": ["AWS Certified Developer","Google UX Design Certificate","Meta Frontend Developer","freeCodeCamp Responsive Web"],
  "Backend Developer": ["AWS Solutions Architect","Google Cloud Professional","Oracle Java Certified","MongoDB Developer"],
  "Full Stack Developer": ["AWS Certified Developer","Google Cloud Professional","Meta Full Stack Developer","Coursera Full Stack"],
  "ML Engineer": ["Google TensorFlow Developer","AWS ML Specialty","DeepLearning.AI","Coursera ML Specialization","Hugging Face NLP"],
  "Data Scientist": ["IBM Data Science","Coursera Data Science","Google Data Analytics","Tableau Desktop Specialist","AWS ML Specialty"],
  "DevOps Engineer": ["AWS DevOps Professional","CKA (Kubernetes)","HashiCorp Terraform","Google DevOps Engineer","Docker Certified"],
  "Data Engineer": ["AWS Big Data","Google Professional Data Engineer","Databricks Certified","dbt Certified","Snowflake SnowPro"],
  "Cloud Architect": ["AWS Solutions Architect Professional","Azure Solutions Architect","GCP Professional Cloud Architect","CCNA"],
  "Product Manager": ["Certified Scrum Product Owner","Google PM Certificate","Pragmatic Marketing","PMP","Aha! PM Certified"],
  "Mobile Developer": ["Google Associate Android Developer","Apple Developer Certification","React Native Certified","Flutter Certificate"],
};

const projectTemplates: Record<string, { name: string; tech: string; description: string }[]> = {
  "Frontend Developer": [
    { name: "E-Commerce Dashboard", tech: "React, TypeScript, Redux, Tailwind", description: "Built real-time analytics dashboard with 40+ reusable components" },
    { name: "Design System Library", tech: "Storybook, React, CSS Modules", description: "Created 80-component design system used by 5-member team" },
    { name: "Portfolio Builder", tech: "Next.js, Framer Motion, Vercel", description: "Drag-and-drop portfolio generator with 20+ templates" },
  ],
  "Backend Developer": [
    { name: "Payment Gateway API", tech: "Node.js, PostgreSQL, Redis, Stripe", description: "Processed $2M+ transactions with 99.9% uptime" },
    { name: "Real-time Chat System", tech: "Go, WebSockets, MongoDB", description: "Scaled to 10K concurrent users with sub-100ms latency" },
    { name: "Auth Microservice", tech: "Java, Spring Boot, JWT, Docker", description: "Secure OAuth2 service handling 50K daily authentications" },
  ],
  "Full Stack Developer": [
    { name: "SaaS HR Platform", tech: "Next.js, Node.js, PostgreSQL, AWS", description: "End-to-end HR tool used by 200+ companies" },
    { name: "AI Job Board", tech: "React, FastAPI, OpenAI, MongoDB", description: "AI-powered job matching for 5000+ candidates" },
    { name: "Real-time Collaboration Tool", tech: "Next.js, WebSockets, Redis, Docker", description: "Notion-like editor with live cursors and conflict resolution" },
  ],
  "ML Engineer": [
    { name: "Resume Screening Model", tech: "Python, BERT, FastAPI, Docker", description: "Reduced screening time by 70% with 91% accuracy" },
    { name: "Recommendation Engine", tech: "PyTorch, Collaborative Filtering, Redis", description: "Increased CTR by 35% for e-commerce platform" },
    { name: "Fraud Detection System", tech: "XGBoost, MLflow, Kafka, AWS", description: "Detected 98.2% of fraudulent transactions in real-time" },
  ],
  "Data Scientist": [
    { name: "Customer Churn Prediction", tech: "Python, Scikit-learn, Tableau, SQL", description: "Reduced churn by 18% saving $500K annually" },
    { name: "Demand Forecasting Model", tech: "Prophet, TensorFlow, Airflow", description: "92% accuracy for 30-day supply chain forecasting" },
    { name: "Sentiment Analysis Dashboard", tech: "NLP, Python, Power BI, Azure", description: "Real-time brand monitoring across 5 social platforms" },
  ],
  "DevOps Engineer": [
    { name: "CI/CD Pipeline Redesign", tech: "Jenkins, Docker, Kubernetes, Terraform", description: "Reduced deployment time from 2h to 8 minutes" },
    { name: "Multi-cloud Infrastructure", tech: "AWS, GCP, Terraform, Helm", description: "Zero-downtime migration of 50+ services" },
    { name: "Monitoring Stack", tech: "Prometheus, Grafana, AlertManager, ELK", description: "99.99% SLA achievement with proactive alerting" },
  ],
  "Data Engineer": [
    { name: "Real-time Data Pipeline", tech: "Kafka, Spark, Airflow, Snowflake", description: "Ingested 10TB/day with <30s latency" },
    { name: "Data Lakehouse", tech: "Delta Lake, dbt, BigQuery, Python", description: "Unified analytics layer serving 15 BI dashboards" },
    { name: "ETL Modernization", tech: "dbt, Airflow, Redshift, Terraform", description: "Replaced legacy ETL reducing costs by 60%" },
  ],
  "Cloud Architect": [
    { name: "Serverless Migration", tech: "AWS Lambda, API Gateway, DynamoDB", description: "Reduced infrastructure cost by 45% at scale" },
    { name: "Multi-region DR System", tech: "AWS, Terraform, Route53, CloudFront", description: "RPO < 1min, RTO < 5min for critical systems" },
    { name: "Zero-Trust Security", tech: "AWS IAM, VPC, WAF, GuardDuty", description: "Achieved SOC2 Type II compliance" },
  ],
  "Product Manager": [
    { name: "Mobile Banking App Launch", tech: "Figma, JIRA, SQL, Mixpanel", description: "Launched to 500K users with 4.8 star rating" },
    { name: "AI Feature Roadmap", tech: "Product Strategy, OKRs, A/B Testing", description: "Shipped 12 AI features increasing retention by 22%" },
    { name: "Developer Platform", tech: "API Design, Documentation, SDK", description: "3000+ developers onboarded in 6 months" },
  ],
  "Mobile Developer": [
    { name: "Fitness Tracking App", tech: "Flutter, Firebase, HealthKit, BLE", description: "100K+ downloads with 4.7 star App Store rating" },
    { name: "Food Delivery App", tech: "React Native, Redux, Maps API", description: "Real-time order tracking for 50K daily orders" },
    { name: "EdTech Mobile Platform", tech: "Swift, CoreML, CloudKit", description: "Offline-first learning app for 200K students" },
  ],
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

export function generateCandidates(): Candidate[] {
  const roles = Object.keys(allSkillPools);
  const candidates: Candidate[] = [];

  for (let i = 1; i <= 250; i++) {
    const rand = seededRandom(i * 7919 + 31337);
    const firstName = pick(firstNames, rand);
    const lastName = pick(lastNames, rand);
    const name = `${firstName} ${lastName}`;
    const emailDomain = pick(["gmail.com","outlook.com","yahoo.com","proton.me","icloud.com"], rand);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${emailDomain}`;
    const phone = `+91 ${String(9000000000 + Math.floor(rand() * 900000000))}`;
    const location = pick(locations, rand);
    const role = pick(roles, rand);
    const skillPool = allSkillPools[role];
    const numSkills = 5 + Math.floor(rand() * 8);
    const skills = pickN(skillPool, numSkills, rand);
    const experience = Math.floor(rand() * 13);
    const degree = pick(degrees, rand);
    const college = pick(colleges, rand);
    const gradYear = 2024 - experience - Math.floor(rand() * 2);
    const cgpa = Math.round((6 + rand() * 4) * 100) / 100; // CGPA 6.0 to 10.0
    const company = experience > 0 ? pick(companies, rand) : "None (Student)";
    const resumeScore = 50 + Math.floor(rand() * 46);
    const atsScore = 45 + Math.floor(rand() * 48);
    const certPool = certificationPool[role] || [];
    const numCerts = Math.floor(rand() * 3);
    const certifications = pickN(certPool, numCerts, rand);
    const hasGithub = rand() > 0.25;
    const hasLinkedin = rand() > 0.15;
    const hasPortfolio = rand() > 0.55;
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z]/g, "").slice(0, 15);
    const projectPool = projectTemplates[role] || projectTemplates["Full Stack Developer"];
    const numProjects = 1 + Math.floor(rand() * 3);
    const projects = pickN(projectPool, numProjects, rand);
    const salaryIdx = Math.min(Math.floor(experience / 2), salaryRanges.length - 1);
    const expectedSalary = salaryRanges[salaryIdx];
    const noticePeriod = pick(noticePeriods, rand);

    candidates.push({
      id: i,
      name,
      email,
      phone,
      location,
      role,
      skills,
      experience,
      education: { degree, college, year: gradYear },
      cgpa,
      company,
      resumeScore,
      atsScore,
      certifications,
      github: hasGithub ? `https://github.com/${username}${i}` : "",
      linkedin: hasLinkedin ? `https://linkedin.com/in/${username}-${i}` : "",
      portfolio: hasPortfolio ? `https://${username}${i}.dev` : "",
      projects,
      summary: `${experience > 0 ? experience + "+ years" : "Fresher"} ${role} with expertise in ${skills.slice(0, 3).join(", ")}. ${certifications.length > 0 ? `Certified in ${certifications[0]}.` : ""} Based in ${location}.`,
      expectedSalary,
      employmentType: pick(employmentTypes, rand),
      workMode: pick(workModes, rand),
      noticePeriod,
    });
  }

  return candidates;
}

export const SAMPLE_CANDIDATES = generateCandidates();
