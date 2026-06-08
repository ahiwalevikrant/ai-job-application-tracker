'use client';

import React, { useState, useEffect } from 'react';
import TopNav from '../components/TopNav';
import Board from '../components/Board';
import SettingsModal from '../components/SettingsModal';
import ProfileModal from '../components/ProfileModal';
import AddJobModal from '../components/AddJobModal';
import JobDetailsModal from '../components/JobDetailsModal';
import JobSearchModal from '../components/JobSearchModal';
import { AIProvider, JobCard, UserProfile, OpenRouterConfig, JobStatus } from '../types';

// Default Seeding Data for Vikrant
const DEFAULT_PROFILE: UserProfile = {
  name: 'Vikrant Ahiwale',
  targetTitle: 'Java Spring Boot & React Angular Developer | AI Specialist',
  skills: 'Java, Spring Boot, Angular, React, TypeScript, Generative AI, LLM Integration, RLM Integrations, Vector Databases, Microservices',
  experienceSummary: 'Software engineer specializing in high-throughput enterprise backends using Java and Spring Boot, and modern client-side portals using Angular and React. Actively building Generative AI solutions, RAG pipelines, and integrating Reinforcement Learning models (RLM) into software products.',
};

const DEFAULT_CONFIG: OpenRouterConfig = {
  provider: 'openrouter',
  apiKey: '',
  apiKeys: {},
  model: 'google/gemini-2.5-flash',
  models: {
    openrouter: 'google/gemini-2.5-flash',
    groq: 'llama-3.3-70b-versatile',
  },
  connected: false,
  connectedProviders: {},
};

const normalizeConfig = (storedConfig: Partial<OpenRouterConfig> | null): OpenRouterConfig => {
  const provider: AIProvider = storedConfig?.provider === 'groq' ? 'groq' : 'openrouter';
  const apiKeys = { ...(storedConfig?.apiKeys || {}) };
  const models = { ...DEFAULT_CONFIG.models, ...(storedConfig?.models || {}) };

  if (storedConfig?.apiKey && !apiKeys[provider]) {
    apiKeys[provider] = storedConfig.apiKey;
  }

  if (storedConfig?.model) {
    models[provider] = storedConfig.model;
  }

  const connectedProviders = {
    ...(storedConfig?.connectedProviders || {}),
    [provider]: storedConfig?.connected ?? Boolean(apiKeys[provider]),
  };

  return {
    provider,
    apiKey: apiKeys[provider] || '',
    apiKeys,
    model: models[provider] || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'google/gemini-2.5-flash'),
    models,
    connected: connectedProviders[provider] ?? Boolean(apiKeys[provider]),
    connectedProviders,
  };
};

const DEFAULT_JOBS: JobCard[] = [
  {
    id: 'stripe-123',
    company: 'Stripe',
    title: 'Senior Full Stack Engineer (Java / React)',
    description: `We are looking for a Senior Software Engineer to join our Payment Interfaces team.

Key Responsibilities:
- Design, build, and maintain scalable APIs using Java and Spring Boot.
- Create elegant developer dashboards and customer checkout interfaces using React and TypeScript.
- Optimize web application performance and end-to-end user experiences.

Requirements:
- 5+ years of software engineering experience.
- Strong proficiency in Java, Spring frameworks, and database schema design.
- Practical experience with React, TypeScript, and modern frontend styling.
- Experience with cloud providers (AWS/GCP) and CI/CD pipelines.`,
    status: 'applied',
    location: 'Remote (US/Canada)',
    salary: '$165,000 - $195,000',
    dateAdded: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    notes: 'Referral requested from John Doe. Resume tailored for payments backend focus.',
  },
  {
    id: 'cohere-456',
    company: 'Cohere',
    title: 'Gen AI Integrations Developer',
    description: `Join Cohere's Enterprise Integration team to build next-generation LLM pipelines.

Key Responsibilities:
- Build customer-facing tools that showcase Cohere API capabilities.
- Integrate LLM embeddings, RAG frameworks, and Agentic pipelines into production apps.
- Implement robust microservices in Python or Java Spring Boot to handle high-concurrency LLM calls.

Requirements:
- Hands-on experience with LLM models, Prompt Engineering, and RAG.
- Solid web framework experience using React or Angular.
- Background in backend microservices (Spring Boot is a big plus).
- Passionate about Generative AI implementations.`,
    status: 'wishlist',
    location: 'Toronto, ON (Hybrid)',
    salary: '$140,000 - $170,000',
    dateAdded: new Date().toISOString(), // today
    notes: 'Position aligns perfectly with my AI integrations and Spring Boot backend profile.',
  },
  {
    id: 'jpmc-789',
    company: 'JPMorgan Chase',
    title: 'Associate Software Engineer - Java & Angular',
    description: `We are seeking an experienced developer to join our Asset Management technology team.

Key Responsibilities:
- Build and refactor core microservices using Java 17, Spring Boot, and Hibernate.
- Design internal analytical dashboards using Angular (version 15+).
- Write robust unit and integration tests using JUnit and Mockito.

Requirements:
- 3+ years of professional Java software development.
- Strong knowledge of Angular, TypeScript, and RxJS.
- Familiarity with SQL databases, Kafka, and event-driven architectures.`,
    status: 'interviewing',
    location: 'Plano, TX (On-site)',
    salary: '$130,000 - $150,000',
    dateAdded: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    notes: 'First round phone interview completed. Tech panel scheduled for Tuesday.',
  },
];

export default function Home() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [config, setConfig] = useState<OpenRouterConfig>(DEFAULT_CONFIG);
  
  // Modal toggle states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isJobSearchOpen, setIsJobSearchOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  const [mounted, setMounted] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedJobs = localStorage.getItem('jp_jobs');
      const storedProfile = localStorage.getItem('jp_profile');
      const storedConfig = localStorage.getItem('jp_config');

      if (storedJobs) {
        setJobs(JSON.parse(storedJobs));
      } else {
        setJobs(DEFAULT_JOBS);
        localStorage.setItem('jp_jobs', JSON.stringify(DEFAULT_JOBS));
      }

      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      } else {
        setProfile(DEFAULT_PROFILE);
        localStorage.setItem('jp_profile', JSON.stringify(DEFAULT_PROFILE));
      }

      if (storedConfig) {
        const parsedConfig = normalizeConfig(JSON.parse(storedConfig));
        setConfig(parsedConfig);
        localStorage.setItem('jp_config', JSON.stringify(parsedConfig));
      } else {
        localStorage.setItem('jp_config', JSON.stringify(DEFAULT_CONFIG));
      }
      
      setMounted(true);
    }
  }, []);

  // Save jobs to localStorage
  const saveJobs = (newJobs: JobCard[]) => {
    setJobs(newJobs);
    localStorage.setItem('jp_jobs', JSON.stringify(newJobs));
  };

  // Add Job
  const handleAddJob = (jobData: Omit<JobCard, 'id' | 'dateAdded'>) => {
    const newJob: JobCard = {
      ...jobData,
      id: Math.random().toString(36).substring(2, 9),
      dateAdded: new Date().toISOString(),
    };
    saveJobs([newJob, ...jobs]);
  };

  const handleAddJobs = (jobItems: Array<Omit<JobCard, 'id' | 'dateAdded'>>) => {
    const newJobs: JobCard[] = jobItems.map((jobData) => ({
      ...jobData,
      id: Math.random().toString(36).substring(2, 9),
      dateAdded: new Date().toISOString(),
    }));
    saveJobs([...newJobs, ...jobs]);
  };

  // Move Job column
  const handleMoveJob = (id: string, newStatus: JobStatus) => {
    const updatedJobs = jobs.map((job) => {
      if (job.id === id) {
        return { ...job, status: newStatus };
      }
      return job;
    });
    saveJobs(updatedJobs);
  };

  // Save/Update Job
  const handleSaveJob = (updatedJob: JobCard) => {
    const updatedJobs = jobs.map((job) => {
      if (job.id === updatedJob.id) {
        return updatedJob;
      }
      return job;
    });
    saveJobs(updatedJobs);
    
    // Update selected job state as well if it's currently open
    if (selectedJob && selectedJob.id === updatedJob.id) {
      setSelectedJob(updatedJob);
    }
  };

  // Delete Job
  const handleDeleteJob = (id: string) => {
    const updatedJobs = jobs.filter((job) => job.id !== id);
    saveJobs(updatedJobs);
    setSelectedJob(null);
  };

  // Save Profile
  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('jp_profile', JSON.stringify(newProfile));
  };

  // Save Settings
  const handleSaveSettings = (newConfig: OpenRouterConfig) => {
    const normalizedConfig = normalizeConfig(newConfig);
    setConfig(normalizedConfig);
    localStorage.setItem('jp_config', JSON.stringify(normalizedConfig));
  };

  if (!mounted) {
    return (
      <div style={{ backgroundColor: '#010102', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#8a8f98', fontSize: '14px' }}>Loading workspace...</span>
      </div>
    );
  }

  const hasEnvApiKey = config.provider === 'openrouter' && process.env.NEXT_PUBLIC_HAS_ENV_KEY === 'true';
  const activeApiKey = config.apiKeys?.[config.provider] || config.apiKey || '';
  const activeModel = config.models?.[config.provider] || config.model;
  const hasApiKey = config.connectedProviders?.[config.provider] !== false && (activeApiKey !== '' || hasEnvApiKey);

  return (
    <div style={{ backgroundColor: 'var(--color-canvas)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopNav
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAddJob={() => setIsAddJobOpen(true)}
        onOpenJobSearch={() => setIsJobSearchOpen(true)}
        hasApiKey={hasApiKey}
        provider={config.provider}
      />

      <main style={styles.mainContainer}>
        {/* Header section */}
        <div style={styles.header}>
          <span className="eyebrow" style={{ marginBottom: 4 }}>Vikrant's Pipeline</span>
          <h1 className="display-md" style={{ color: 'var(--color-ink)', marginBottom: 8 }}>
            Application Tracker
          </h1>
          <p className="subhead" style={{ fontSize: '14px', maxWidth: '600px' }}>
            Track and tailor your job applications. Drag jobs between columns and click to generate custom cover letters, resume bullet points, and interview questions.
          </p>
        </div>

        {/* Board component */}
        <Board
          jobs={jobs}
          onMoveJob={handleMoveJob}
          onCardClick={(job) => setSelectedJob(job)}
        />
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveSettings}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />

      <AddJobModal
        isOpen={isAddJobOpen}
        onClose={() => setIsAddJobOpen(false)}
        onAdd={handleAddJob}
        aiApiKey={hasApiKey ? activeApiKey : ''}
        aiModel={activeModel}
        aiProvider={config.provider}
      />

      <JobSearchModal
        isOpen={isJobSearchOpen}
        onClose={() => setIsJobSearchOpen(false)}
        profile={profile}
        aiApiKey={hasApiKey ? activeApiKey : ''}
        aiModel={activeModel}
        aiProvider={config.provider}
        openRouterApiKey={config.apiKeys?.openrouter || ''}
        onAddJobs={handleAddJobs}
      />

      {selectedJob && (
        <JobDetailsModal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          job={selectedJob}
          profile={profile}
          aiApiKey={hasApiKey ? activeApiKey : ''}
          aiModel={activeModel}
          aiProvider={config.provider}
          onSaveJob={handleSaveJob}
          onDeleteJob={handleDeleteJob}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  mainContainer: {
    flex: 1,
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: 'var(--spacing-lg) var(--spacing-lg) 0 var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
};
