'use server';

import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import { AIProvider, JobCard, JobSearchCriteria, JobSearchResult, UserProfile } from '../types';
import { deleteJob, getJobs, getProfile, saveJob, saveJobs, saveProfile } from '../lib/database';

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      annotations?: Array<{
        type?: string;
        url_citation?: {
          url?: string;
          title?: string;
          content?: string;
        };
      }>;
    };
  }>;
}

interface ProviderModel {
  id: string;
  name: string;
}

const DEFAULT_PROVIDER: AIProvider = 'openrouter';
const DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: 'google/gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
};

function formatDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Database request failed.';
  return message.includes('Unknown database')
    ? `${message} Create the MySQL database named ${process.env.MYSQL_DATABASE || 'job_portal'} first, or update MYSQL_DATABASE in .env.local.`
    : message;
}

export async function getWorkspaceDataAction() {
  try {
    const [jobs, profile] = await Promise.all([getJobs(), getProfile()]);
    return { success: true, jobs, profile };
  } catch (error: unknown) {
    console.error('Load Workspace Data Error:', error);
    return { success: false, error: formatDatabaseError(error), jobs: [], profile: null };
  }
}

export async function saveProfileAction(profile: UserProfile) {
  try {
    const savedProfile = await saveProfile(profile);
    return { success: true, profile: savedProfile };
  } catch (error: unknown) {
    console.error('Save Profile Error:', error);
    return { success: false, error: formatDatabaseError(error) };
  }
}

export async function createJobAction(jobData: Omit<JobCard, 'id' | 'dateAdded'>) {
  try {
    const job: JobCard = {
      ...jobData,
      id: randomUUID(),
      dateAdded: new Date().toISOString(),
    };
    await saveJob(job);
    return { success: true, job };
  } catch (error: unknown) {
    console.error('Create Job Error:', error);
    return { success: false, error: formatDatabaseError(error) };
  }
}

export async function createJobsAction(jobItems: Array<Omit<JobCard, 'id' | 'dateAdded'>>) {
  try {
    const createdAt = new Date().toISOString();
    const jobs: JobCard[] = jobItems.map((jobData) => ({
      ...jobData,
      id: randomUUID(),
      dateAdded: createdAt,
    }));
    await saveJobs(jobs);
    return { success: true, jobs };
  } catch (error: unknown) {
    console.error('Create Jobs Error:', error);
    return { success: false, error: formatDatabaseError(error) };
  }
}

export async function updateJobAction(job: JobCard) {
  try {
    await saveJob(job);
    return { success: true, job };
  } catch (error: unknown) {
    console.error('Update Job Error:', error);
    return { success: false, error: formatDatabaseError(error) };
  }
}

export async function deleteJobAction(id: string) {
  try {
    await deleteJob(id);
    return { success: true };
  } catch (error: unknown) {
    console.error('Delete Job Error:', error);
    return { success: false, error: formatDatabaseError(error) };
  }
}

function getProvider(provider?: AIProvider): AIProvider {
  return provider === 'groq' ? 'groq' : DEFAULT_PROVIDER;
}

function getApiKey(provider?: AIProvider, clientKey?: string): string {
  const selectedProvider = getProvider(provider);
  const envKey = selectedProvider === 'groq' ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
  if (envKey) return envKey;
  if (clientKey) return clientKey;
  throw new Error(`${selectedProvider === 'groq' ? 'Groq' : 'OpenRouter'} API key is missing. Add it in Settings or configure the matching environment variable.`);
}

function getModel(provider?: AIProvider, model?: string): string {
  const selectedProvider = getProvider(provider);
  return model?.trim() || DEFAULT_MODELS[selectedProvider];
}

function getCompletionUrl(provider?: AIProvider): string {
  return getProvider(provider) === 'groq'
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
}

function getHeaders(provider: AIProvider, apiKey: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost:3000';
    headers['X-Title'] = 'Job Portal Tracker';
  }

  return headers;
}

function buildCandidateContext(profile: {
  name: string;
  targetTitle: string;
  skills: string;
  experienceSummary: string;
  resumeText?: string;
}) {
  const resumeContext = profile.resumeText?.trim()
    ? `\nUploaded Resume Text:\n${profile.resumeText.trim().slice(0, 12000)}`
    : '';

  return `Candidate Name: ${profile.name}
Target Role: ${profile.targetTitle}
Candidate Skills: ${profile.skills}
Candidate Background/Summary: ${profile.experienceSummary}${resumeContext}`;
}

function parseJsonContent(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) {
      throw new Error('AI response did not contain valid JSON.');
    }
    return JSON.parse(match[1]);
  }
}

function stripHtml(input?: string) {
  if (!input) return '';
  return cheerio.load(input).text().replace(/\s+/g, ' ').trim();
}

function scorePublicJob(job: JobSearchResult, criteria: JobSearchCriteria, profile: { skills: string; targetTitle: string }) {
  const haystack = `${job.title} ${job.company} ${job.description} ${job.location}`.toLowerCase();
  const terms = `${criteria.targetRole} ${criteria.keywords || profile.skills}`
    .split(/[,| ]+/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 2);
  const hits = terms.filter((term) => haystack.includes(term)).length;
  return Math.max(45, Math.min(92, 55 + hits * 4));
}

async function fetchPublicJobBoardResults(
  criteria: JobSearchCriteria,
  profile: { skills: string; targetTitle: string }
): Promise<JobSearchResult[]> {
  const query = encodeURIComponent(criteria.targetRole || profile.targetTitle);
  const excluded = criteria.excludedCompanies
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const [remotiveResult, remoteOkResult] = await Promise.allSettled([
    fetch(`https://remotive.com/api/remote-jobs?search=${query}`, {
      headers: { 'User-Agent': 'Job Portal Tracker' },
      cache: 'no-store',
    }),
    fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'Job Portal Tracker' },
      cache: 'no-store',
    }),
  ]);

  const jobs: JobSearchResult[] = [];

  if (remotiveResult.status === 'fulfilled' && remotiveResult.value.ok) {
    const payload = await remotiveResult.value.json();
    if (Array.isArray(payload?.jobs)) {
      payload.jobs.slice(0, 20).forEach((job: any, index: number) => {
        jobs.push({
          id: `remotive-${job.id || index}`,
          company: job.company_name || 'Unknown Company',
          title: job.title || 'Untitled Role',
          location: job.candidate_required_location || 'Remote',
          salary: job.salary || '',
          url: job.url || '',
          description: stripHtml(job.description).slice(0, 900),
          matchScore: 0,
          matchReason: 'Matched from Remotive public remote jobs.',
          gaps: '',
          suggestedKeywords: Array.isArray(job.tags) ? job.tags.slice(0, 8).join(', ') : '',
          source: 'Remotive',
        });
      });
    }
  }

  if (remoteOkResult.status === 'fulfilled' && remoteOkResult.value.ok) {
    const payload = await remoteOkResult.value.json();
    if (Array.isArray(payload)) {
      payload
        .filter((job: any) => job?.position && job?.company)
        .slice(0, 35)
        .forEach((job: any, index: number) => {
          jobs.push({
            id: `remoteok-${job.id || job.slug || index}`,
            company: job.company || 'Unknown Company',
            title: job.position || 'Untitled Role',
            location: job.location || 'Remote',
            salary: job.salary_min || job.salary_max ? `$${job.salary_min || '?'} - $${job.salary_max || '?'}` : '',
            url: job.url || (job.slug ? `https://remoteok.com/remote-jobs/${job.slug}` : ''),
            description: stripHtml(job.description).slice(0, 900),
            matchScore: 0,
            matchReason: 'Matched from Remote OK public jobs.',
            gaps: '',
            suggestedKeywords: Array.isArray(job.tags) ? job.tags.slice(0, 8).join(', ') : '',
            source: 'Remote OK',
          });
        });
    }
  }

  const deduped = jobs.filter((job, index, array) => {
    const key = `${job.company.toLowerCase()}-${job.title.toLowerCase()}-${job.url}`;
    return array.findIndex((candidate) => `${candidate.company.toLowerCase()}-${candidate.title.toLowerCase()}-${candidate.url}` === key) === index;
  });

  return deduped
    .filter((job) => !excluded.some((item) => job.company.toLowerCase().includes(item) || job.url?.toLowerCase().includes(item)))
    .map((job) => ({
      ...job,
      matchScore: scorePublicJob(job, criteria, profile),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 12);
}

function normalizeSearchResults(results: unknown, fallbackResults: JobSearchResult[] = []): JobSearchResult[] {
  const fallbackByUrl = new Map(fallbackResults.map((item) => [item.url || `${item.company}-${item.title}`, item]));

  return Array.isArray(results)
    ? results
        .map((item: Partial<JobSearchResult>, index: number) => {
          const fallback = fallbackByUrl.get(item.url || `${item.company}-${item.title}`) || fallbackResults[index];
          return {
            id: item.id || fallback?.id || `${Date.now()}-${index}`,
            company: item.company || fallback?.company || 'Unknown Company',
            title: item.title || fallback?.title || 'Untitled Role',
            location: item.location || fallback?.location || '',
            salary: item.salary || fallback?.salary || '',
            url: item.url || fallback?.url || '',
            description: item.description || fallback?.description || '',
            matchScore: Math.max(0, Math.min(100, Number(item.matchScore ?? fallback?.matchScore) || 0)),
            matchReason: item.matchReason || fallback?.matchReason || '',
            gaps: item.gaps || fallback?.gaps || '',
            suggestedKeywords: item.suggestedKeywords || fallback?.suggestedKeywords || '',
            source: item.source || fallback?.source || '',
          };
        })
        .filter((item: JobSearchResult) => item.title && item.company)
        .slice(0, 8)
    : [];
}

async function searchJobsWithOpenRouterWebSearch(
  criteria: JobSearchCriteria,
  profile: { name: string; targetTitle: string; skills: string; experienceSummary: string; resumeText?: string },
  apiKey: string
) {
  try {
    const candidateContext = buildCandidateContext(profile);
    const systemPrompt = `You are an expert job-search research assistant with live web search access.
Find current, real job postings that match the candidate profile and search preferences.
Return only JSON with "questions" and "results" arrays. Results must include company, title, location, salary, url, description, matchScore, matchReason, gaps, suggestedKeywords, and source.
Do not invent URLs.`;
    const userPrompt = `Candidate:
${candidateContext}

Search preferences:
- Target role: ${criteria.targetRole || profile.targetTitle}
- Location: ${criteria.location || 'Any relevant location'}
- Work mode: ${criteria.workMode}
- Salary target: ${criteria.salary || 'Not specified'}
- Required/preferred keywords: ${criteria.keywords || profile.skills}
- Excluded companies/domains: ${criteria.excludedCompanies || 'None'}
- Additional notes or answers: ${criteria.notes || 'None'}
- Ask clarifying questions first: ${criteria.askQuestionsFirst ? 'Yes' : 'No'}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: getHeaders('openrouter', apiKey),
      body: JSON.stringify({
        model: 'perplexity/sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'openrouter:web_search',
            parameters: {
              engine: 'exa',
              allowed_domains: ['greenhouse.io', 'lever.co', 'ashbyhq.com', 'workdayjobs.com', 'linkedin.com', 'indeed.com', 'wellfound.com'],
              max_results: 6,
              max_total_results: 10,
              search_context_size: 'low',
            },
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenRouter returned an empty search response.');
    }

    const parsed = parseJsonContent(content);
    return {
      questions: Array.isArray(parsed?.questions) ? parsed.questions.filter(Boolean).slice(0, 4) : [],
      results: normalizeSearchResults(parsed?.results),
    };
  } catch (error) {
    console.error('OpenRouter Web Search Fallback Error:', error);
    return {
      questions: [],
      results: [],
    };
  }
}

export async function getProviderModelsAction(provider?: AIProvider, clientApiKey?: string) {
  const selectedProvider = getProvider(provider);

  try {
    const response = await fetch(
      selectedProvider === 'groq'
        ? 'https://api.groq.com/openai/v1/models'
        : 'https://openrouter.ai/api/v1/models',
      {
        headers: selectedProvider === 'groq'
          ? { Authorization: `Bearer ${getApiKey(selectedProvider, clientApiKey)}` }
          : undefined,
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Model catalog request failed.');
    }

    const payload = await response.json();
    const models: ProviderModel[] = Array.isArray(payload?.data)
      ? payload.data
          .map((item: { id?: string; name?: string; owned_by?: string }) => ({
            id: item.id || '',
            name: item.owned_by ? `${item.name || item.id} (${item.owned_by})` : item.name || item.id || '',
          }))
          .filter((item: ProviderModel) => item.id)
      : [];

    if (models.length === 0) {
      throw new Error('No models were returned.');
    }

    return { success: true, models };
  } catch (error: any) {
    console.error('Model Catalog Action Error:', error);
    return {
      success: false,
      error: error.message || 'Unable to load model catalog.',
      models: [],
    };
  }
}

export async function searchJobsAction(
  criteria: JobSearchCriteria,
  profile: { name: string; targetTitle: string; skills: string; experienceSummary: string; resumeText?: string },
  clientApiKey?: string,
  model?: string,
  provider?: AIProvider,
  openRouterApiKey?: string
) {
  try {
    const selectedProvider = getProvider(provider);
    const candidateContext = buildCandidateContext(profile);

    if (!criteria.targetRole.trim() && criteria.askQuestionsFirst) {
      return {
        success: true,
        questions: [
          'What exact role title should I search for first?',
          'Which locations or time zones are acceptable?',
          'Are there companies, industries, or contract types you want to avoid?',
        ],
        results: [],
      };
    }

    const publicResults = await fetchPublicJobBoardResults(criteria, profile);

    const rankSystemPrompt = `You are an expert job-search ranking assistant.
You receive live job postings collected from public job-board APIs, plus candidate profile context.
Rank and tailor the postings for the candidate.
Return only JSON with this shape:
{
  "questions": [],
  "results": [
    {
      "company": "Company",
      "title": "Role title",
      "location": "Location or Remote",
      "salary": "Salary if available, otherwise empty",
      "url": "Direct posting URL",
      "description": "Concise markdown summary of responsibilities, requirements, and stack",
      "matchScore": 85,
      "matchReason": "Why this matches the candidate",
      "gaps": "Any missing skills or concerns",
      "suggestedKeywords": "Resume keywords to emphasize",
      "source": "Domain or job board"
    }
  ]
}
If askQuestionsFirst is true and critical information is missing, return 2-4 questions and an empty results array.
Return up to 8 jobs when enough information exists. Use matchScore from 0 to 100. Keep real URLs exactly as provided.`;

    const rankUserPrompt = `Candidate:
${candidateContext}

Search preferences:
- Target role: ${criteria.targetRole || profile.targetTitle}
- Location: ${criteria.location || 'Any relevant location'}
- Work mode: ${criteria.workMode}
- Salary target: ${criteria.salary || 'Not specified'}
- Required/preferred keywords: ${criteria.keywords || profile.skills}
- Excluded companies/domains: ${criteria.excludedCompanies || 'None'}
- Additional notes or answers: ${criteria.notes || 'None'}
- Ask clarifying questions first: ${criteria.askQuestionsFirst ? 'Yes' : 'No'}

Live public job candidates:
${JSON.stringify(publicResults.slice(0, 12), null, 2)}`;

    if (publicResults.length > 0) {
      try {
        const apiKey = getApiKey(selectedProvider, clientApiKey);
        const response = await fetch(getCompletionUrl(selectedProvider), {
          method: 'POST',
          headers: getHeaders(selectedProvider, apiKey),
          body: JSON.stringify({
            model: getModel(selectedProvider, model),
            messages: [
              { role: 'system', content: rankSystemPrompt },
              { role: 'user', content: rankUserPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as OpenRouterResponse;
        const content = data.choices[0]?.message?.content;
        if (!content) {
          throw new Error('AI provider returned an empty ranking response.');
        }

        const parsed = parseJsonContent(content);
        const results = normalizeSearchResults(parsed?.results, publicResults);

        return {
          success: true,
          questions: Array.isArray(parsed?.questions) ? parsed.questions.filter(Boolean).slice(0, 4) : [],
          results: results.length > 0 ? results : publicResults.slice(0, 8),
          source: selectedProvider,
        };
      } catch (rankingError: any) {
        console.error('Search Ranking Fallback:', rankingError);
        return {
          success: true,
          warning: `Found jobs from public boards, but AI ranking failed: ${rankingError.message || 'Unknown provider error'}`,
          questions: [],
          results: publicResults.slice(0, 8),
          source: 'public-job-boards',
        };
      }
    }

    if (openRouterApiKey) {
      const webSearchResult = await searchJobsWithOpenRouterWebSearch(criteria, profile, openRouterApiKey);
      if (webSearchResult.results.length > 0 || webSearchResult.questions.length > 0) {
        return {
          success: true,
          questions: webSearchResult.questions,
          results: webSearchResult.results,
          source: 'openrouter-web-search',
        };
      }
    }

    return {
      success: false,
      error: 'No jobs found from public boards. Try a broader role title or connect OpenRouter for web search fallback.',
      questions: [],
      results: [],
    };
  } catch (error: any) {
    console.error('Search Jobs Action Error:', error);
    return {
      success: false,
      error: error.message || 'Unable to search live jobs.',
      questions: [],
      results: [],
    };
  }
}

/**
 * Scrapes a URL, cleans the text content, and uses LLM to parse metadata.
 */
export async function scrapeUrlAction(url: string, clientApiKey?: string, model?: string, provider?: AIProvider) {
  try {
    const selectedProvider = getProvider(provider);
    const apiKey = getApiKey(selectedProvider, clientApiKey);
    
    // Fetch HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footers, etc.
    $('script, style, nav, footer, header, noscript, iframe, svg').remove();

    // Get clean visible text
    const textContent = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // limit to 15k chars for prompt safety

    if (!textContent) {
      throw new Error('No readable text content found on the page.');
    }

    // Call the configured LLM provider to parse the raw text into a structured job description.
    const completionUrl = getCompletionUrl(selectedProvider);
    const systemPrompt = `You are a professional assistant specialized in parsing job details from scraped job posting pages.
Extract the details and output them strictly as a JSON object with this exact structure:
{
  "company": "Company Name",
  "title": "Job Title",
  "description": "Clean, structured markdown summary of the job description, key requirements, and responsibilities. Keep it concise but make sure to capture key tech stacks, skills, and qualifications.",
  "location": "Location (e.g. San Francisco, CA / Remote)",
  "salary": "Salary Range (if mentioned, otherwise leave empty)"
}
Do not include any explanation or markdown outside the JSON. Return only the raw JSON.`;

    const openRouterResponse = await fetch(completionUrl, {
      method: 'POST',
      headers: getHeaders(selectedProvider, apiKey),
      body: JSON.stringify({
        model: getModel(selectedProvider, model),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the scraped text from a job page:\n\n${textContent}` }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      throw new Error(`${selectedProvider === 'groq' ? 'Groq' : 'OpenRouter'} Error: ${errorText}`);
    }

    const data = (await openRouterResponse.json()) as OpenRouterResponse;
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`${selectedProvider === 'groq' ? 'Groq' : 'OpenRouter'} returned an empty response.`);
    }

    const parsedData = JSON.parse(content);
    return {
      success: true,
      data: parsedData,
    };

  } catch (error: any) {
    console.error('Scrape URL Action Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while parsing the job listing.',
    };
  }
}

/**
 * Generates tailored cover letter, resume bullet points, or interview questions using OpenRouter.
 */
export async function generateAIAction(
  promptType: 'cover_letter' | 'resume_bullets' | 'interview_questions',
  job: { title: string; company: string; description: string; salary?: string; location?: string },
  profile: { name: string; targetTitle: string; skills: string; experienceSummary: string; resumeText?: string },
  clientApiKey?: string,
  model?: string,
  provider?: AIProvider
) {
  try {
    const selectedProvider = getProvider(provider);
    const apiKey = getApiKey(selectedProvider, clientApiKey);
    const completionUrl = getCompletionUrl(selectedProvider);

    let systemPrompt = '';
    let userPrompt = '';
    const candidateContext = buildCandidateContext(profile);

    if (promptType === 'cover_letter') {
      systemPrompt = `You are an expert career advisor and professional writer. Your goal is to write a highly tailored cover letter.
- Do not use generic AI opening and closing phrases (e.g. "I am writing to express my enthusiastic interest...").
- Write in a clean, confident, professional, and slightly conversational tone.
- Directly connect the candidate's skills to the specific responsibilities of the job description.
- Use natural flow and paragraphs.
- Keep the length around 250 to 350 words.
- Format with clean Markdown (no headers for address/date, start directly with Salutation).`;

      userPrompt = `Write a tailored cover letter for:
${candidateContext}

Target Job Details:
Company: ${job.company}
Role: ${job.title}
Job Description & Requirements:
${job.description}

Create a compelling, professional cover letter that makes the candidate stand out.`;
    } else if (promptType === 'resume_bullets') {
      systemPrompt = `You are a professional resume writer.
- Create 3 to 5 high-impact, results-driven resume bullet points tailored to the job description.
- Use the STAR/XYZ method (accomplished [X] as measured by [Y], by doing [Z]) where possible.
- Incorporate key technologies from the candidate's skills that match the job requirements.
- Start each bullet point with a strong action verb.
- Return the bullets formatted as a markdown bullet list. Do not add intro or outro text.`;

      userPrompt = `Generate tailored resume bullet points for:
${candidateContext}

Target Job Details:
Company: ${job.company}
Role: ${job.title}
Job Description:
${job.description}`;
    } else if (promptType === 'interview_questions') {
      systemPrompt = `You are an expert interviewer.
- Generate 5 highly likely interview questions (mix of technical and behavioral) for the specified job.
- For each question, provide:
  1. The Question itself.
  2. "Why they ask this": 1 sentence explanation of what the interviewer is looking for.
  3. "Talking Points": 2-3 specific points tailored to the candidate's background (mentioning Spring Boot, Angular, React, Gen AI, or RLM integrations where appropriate) that they should mention in their answer.
- Format the output in clean, readable markdown using headers, bold text, and lists.
- Output exactly 5 questions. No intro or outro text.`;

      userPrompt = `Generate 5 likely interview questions and tailored candidate answers/talking points for:
${candidateContext}

Target Job Details:
Company: ${job.company}
Role: ${job.title}
Job Description:
${job.description}`;
    }

    const openRouterResponse = await fetch(completionUrl, {
      method: 'POST',
      headers: getHeaders(selectedProvider, apiKey),
      body: JSON.stringify({
        model: getModel(selectedProvider, model),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      throw new Error(`${selectedProvider === 'groq' ? 'Groq' : 'OpenRouter'} Error: ${errorText}`);
    }

    const data = (await openRouterResponse.json()) as OpenRouterResponse;
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`${selectedProvider === 'groq' ? 'Groq' : 'OpenRouter'} returned an empty response.`);
    }

    return {
      success: true,
      text: content,
    };

  } catch (error: any) {
    console.error('Generate AI Action Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during AI generation.',
    };
  }
}
