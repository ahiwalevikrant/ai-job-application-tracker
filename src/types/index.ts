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

export interface UserProfile {
  name: string;
  targetTitle: string;
  skills: string;
  experienceSummary: string;
  resumeName?: string;
  resumeData?: string; // base64 representation
  resumeText?: string; // extracted text content
}

export type AIProvider = 'openrouter' | 'groq';

export interface OpenRouterConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  connected?: boolean;
}
