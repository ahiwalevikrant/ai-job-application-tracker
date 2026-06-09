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
import {
  createJobAction,
  createJobsAction,
  deleteJobAction,
  getWorkspaceDataAction,
  saveProfileAction,
  updateJobAction,
} from './actions';

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

export default function Home() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [config, setConfig] = useState<OpenRouterConfig>(DEFAULT_CONFIG);
  const [dataError, setDataError] = useState('');
  
  // Modal toggle states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isJobSearchOpen, setIsJobSearchOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);

  const [mounted, setMounted] = useState(false);

  // Load persisted profile and jobs from MySQL. API settings are intentionally session-only.
  useEffect(() => {
    let active = true;

    async function loadWorkspaceData() {
      const result = await getWorkspaceDataAction();
      if (!active) return;

      if (result.success) {
        setJobs(result.jobs);
        setProfile(result.profile || DEFAULT_PROFILE);
        setDataError('');
      } else {
        setJobs([]);
        setProfile(DEFAULT_PROFILE);
        setDataError(result.error || 'Unable to load saved profile and jobs from MySQL.');
      }

      setMounted(true);
    }

    void loadWorkspaceData();

    return () => {
      active = false;
    };
  }, []);

  // Add Job
  const handleAddJob = async (jobData: Omit<JobCard, 'id' | 'dateAdded'>) => {
    const result = await createJobAction(jobData);
    if (result.success && result.job) {
      setJobs((current) => [result.job, ...current]);
      setDataError('');
    } else {
      setDataError(result.error || 'Unable to save the job to MySQL.');
    }
  };

  const handleAddJobs = async (jobItems: Array<Omit<JobCard, 'id' | 'dateAdded'>>) => {
    const result = await createJobsAction(jobItems);
    if (result.success && result.jobs) {
      setJobs((current) => [...result.jobs, ...current]);
      setDataError('');
    } else {
      setDataError(result.error || 'Unable to save the selected jobs to MySQL.');
    }
  };

  // Move Job column
  const handleMoveJob = async (id: string, newStatus: JobStatus) => {
    const job = jobs.find((item) => item.id === id);
    if (!job) return;

    const updatedJob = { ...job, status: newStatus };
    setJobs((current) => current.map((item) => (item.id === id ? updatedJob : item)));
    const result = await updateJobAction(updatedJob);
    if (!result.success) {
      setDataError(result.error || 'Unable to update the job status in MySQL.');
      setJobs((current) => current.map((item) => (item.id === id ? job : item)));
    } else {
      setDataError('');
    }
  };

  // Save/Update Job
  const handleSaveJob = async (updatedJob: JobCard) => {
    const previousJob = jobs.find((job) => job.id === updatedJob.id);
    setJobs((current) => current.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
    setSelectedJob((current) => (current?.id === updatedJob.id ? updatedJob : current));

    const result = await updateJobAction(updatedJob);
    if (!result.success) {
      setDataError(result.error || 'Unable to save the job in MySQL.');
      if (previousJob) {
        setJobs((current) => current.map((job) => (job.id === updatedJob.id ? previousJob : job)));
        setSelectedJob((current) => (current?.id === updatedJob.id ? previousJob : current));
      }
    } else {
      setDataError('');
    }
  };

  // Delete Job
  const handleDeleteJob = async (id: string) => {
    const previousJobs = jobs;
    setJobs((current) => current.filter((job) => job.id !== id));
    setSelectedJob(null);

    const result = await deleteJobAction(id);
    if (!result.success) {
      setJobs(previousJobs);
      setDataError(result.error || 'Unable to delete the job from MySQL.');
    } else {
      setDataError('');
    }
  };

  // Save Profile
  const handleSaveProfile = async (newProfile: UserProfile) => {
    const previousProfile = profile;
    setProfile(newProfile);
    const result = await saveProfileAction(newProfile);
    if (!result.success) {
      setProfile(previousProfile);
      setDataError(result.error || 'Unable to save the profile to MySQL.');
    } else {
      setDataError('');
    }
  };

  // Keep settings in memory only. API keys are not stored locally or in MySQL.
  const handleSaveSettings = (newConfig: OpenRouterConfig) => {
    const normalizedConfig = normalizeConfig(newConfig);
    setConfig(normalizedConfig);
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
          <span className="eyebrow" style={{ marginBottom: 4 }}>Vikrant&apos;s Pipeline</span>
          <h1 className="display-md" style={{ color: 'var(--color-ink)', marginBottom: 8 }}>
            Application Tracker
          </h1>
          <p className="subhead" style={{ fontSize: '14px', maxWidth: '600px' }}>
            Track and tailor your job applications. Drag jobs between columns and click to generate custom cover letters, resume bullet points, and interview questions.
          </p>
        </div>

        {dataError && (
          <div style={styles.errorAlert}>
            {dataError}
          </div>
        )}

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
  errorAlert: {
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid rgba(226, 72, 72, 0.3)',
    borderRadius: 'var(--rounded-md)',
    padding: '10px 14px',
    color: 'var(--color-danger)',
    fontSize: '14px',
  },
};
