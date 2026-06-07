# AI Job Application Tracker

A modern job-application tracking dashboard built with Next.js, React, and TypeScript. The app helps you manage a personal application pipeline, import job descriptions from posting URLs, upload resume context, and generate tailored career materials using OpenRouter or Groq.

## Features

- Kanban-style job pipeline with stages for wishlist, applied, interviewing, offer, and rejected.
- Add job applications manually with company, title, salary, location, notes, and markdown descriptions.
- Smart job import from a posting URL using AI-assisted page parsing.
- Profile modal for candidate details, skills, professional summary, and resume upload.
- Resume upload support for PDF, TXT, and Markdown files.
- Client-side resume text extraction:
  - TXT and Markdown are parsed with browser FileReader APIs.
  - PDF parsing loads pdf.js on demand from CDN.
- AI-generated career materials:
  - Tailored cover letters.
  - Resume bullet points.
  - Interview preparation questions and talking points.
- AI provider settings for OpenRouter and Groq.
- Searchable model input with live model loading and fallback model options.
- Connect, disconnect, and delete API key controls.
- Local-first storage using browser localStorage.
- Dark, responsive, floating-navigation interface.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Cheerio for server-side HTML parsing
- lucide-react for icons
- OpenRouter API
- Groq API
- pdf.js loaded on demand for PDF resume extraction

## Project Structure

```text
src/
  app/
    actions.ts        Server actions for scraping, AI generation, and model loading
    globals.css       Global theme, typography, inputs, and buttons
    layout.tsx        Root app layout
    page.tsx          Main application state and modal orchestration
  components/
    AddJobModal.tsx       Add jobs manually or import from URL
    Board.tsx             Kanban board UI
    JobDetailsModal.tsx   Job details, notes, generated materials
    ProfileModal.tsx      Candidate profile and resume upload
    SettingsModal.tsx     AI provider, API key, and model settings
    TopNav.tsx            Floating top navigation
  types/
    index.ts          Shared app types
```

## Getting Started

### Prerequisites

- Node.js 20 or later recommended
- npm
- An OpenRouter API key, a Groq API key, or both

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file in the project root:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
GROQ_API_KEY=your_groq_key_here
NEXT_PUBLIC_HAS_ENV_KEY=true
```

All variables are optional if you prefer entering API keys from the Settings modal. For Groq live model loading, a Groq key is required.

### Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### Build

```bash
npm run build
```

### Start Production Build

```bash
npm run start
```

## AI Provider Setup

Open the Settings modal in the app and choose a provider:

- OpenRouter: use a key from `https://openrouter.ai/keys`
- Groq: use a key from `https://console.groq.com/keys`

Then:

1. Paste the API key.
2. Select or type a model id.
3. Click Connect.

You can also:

- Refresh the model list.
- Disconnect the current provider.
- Delete the stored API key from localStorage.

## Default Models

OpenRouter fallback model:

```text
google/gemini-2.5-flash
```

Groq fallback model:

```text
llama-3.3-70b-versatile
```

The app can load live model catalogs where available. If model loading fails, it falls back to built-in popular models.

## Resume Upload Notes

Resume data is stored locally in the browser:

- `resumeName`: original file name
- `resumeData`: base64 file data for download/retrieval
- `resumeText`: extracted text used as AI context

Uploaded files are limited to 4 MB to stay within typical localStorage limits. No resume file is uploaded to your own backend; extracted text is sent to the selected AI provider only when generating AI materials.

## Local Storage Keys

The app stores data under:

```text
jp_jobs
jp_profile
jp_config
```

Clearing browser storage will reset jobs, profile, resume data, and AI settings.

## Main Workflows

### Add a Job Manually

1. Click Add Job.
2. Fill in company, role, location, salary, and description.
3. Choose pipeline stage.
4. Save to the board.

### Import a Job from URL

1. Click Add Job.
2. Paste a job posting URL.
3. Click Import Details.
4. Review the extracted fields.
5. Save to the board.

### Generate AI Materials

1. Open a job card.
2. Choose Cover Letter, Resume Bullets, or Interview Prep.
3. Click Generate.
4. Copy or regenerate the result.

### Upload Resume Context

1. Open Profile.
2. Upload a PDF, TXT, or Markdown resume.
3. Confirm the parsed word count.
4. Save profile changes.

## Deployment

This project is ready to deploy on Vercel.

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add environment variables in Vercel Project Settings if you want server-side provider keys.
4. Deploy.

## Suggested GitHub Repository Names

Recommended:

```text
ai-job-application-tracker
```

Other good options:

```text
job-portal-ai-tracker
career-pipeline-ai
ai-career-application-board
smart-job-tracker
```

## Scripts

```bash
npm run dev      # Start local development server
npm run build    # Create production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Security and Privacy

- API keys entered in the Settings modal are stored in localStorage.
- For safer deployments, prefer environment variables.
- Resume text is included in prompts sent to the selected AI provider.
- Do not upload sensitive documents unless you are comfortable sending extracted text to the selected provider during generation.

## License

Add a license before publishing if this repository will be public. MIT is a common choice for portfolio projects.
