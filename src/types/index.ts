export type JobStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface JobCard {
  id: string;
  company: string;
  title: string;
  description: string;
  url?: string;
  status: JobStatus;
  dateAdded: string;
  notes?: string;
  salary?: string;
  location?: string;
  
  // Generated materials
  coverLetter?: string;
  resumeBullets?: string;
  interviewQuestions?: string; // Stored JSON or raw text
}

export interface JobSearchResult {
  id: string;
  company: string;
  title: string;
  location?: string;
  salary?: string;
  url?: string;
  description: string;
  matchScore: number;
  matchReason: string;
  gaps?: string;
  suggestedKeywords?: string;
  source?: string;
}

export interface JobSearchCriteria {
  targetRole: string;
  location: string;
  workMode: 'any' | 'remote' | 'hybrid' | 'onsite';
  salary: string;
  keywords: string;
  excludedCompanies: string;
  notes: string;
  askQuestionsFirst: boolean;
}

export interface UserProfile {
  name: string;
  targetTitle: string;
  skills: string;
  experienceSummary: string;
  resumeName?: string;
  resumeData?: string; // base64 representation
  resumeText?: string; // extracted text content
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export type AIProvider = 'openrouter' | 'groq';

export interface OpenRouterConfig {
  provider: AIProvider;
  apiKey: string;
  apiKeys?: Partial<Record<AIProvider, string>>;
  model: string;
  models?: Partial<Record<AIProvider, string>>;
  connected?: boolean;
  connectedProviders?: Partial<Record<AIProvider, boolean>>;
}
