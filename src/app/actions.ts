'use server';

import * as cheerio from 'cheerio';
import { AIProvider } from '../types';

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
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
