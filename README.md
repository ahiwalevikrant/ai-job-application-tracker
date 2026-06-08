# AI Job Application Tracker

A local-first job application tracker that helps manage a career pipeline, search live jobs, import job postings, upload resume context, and generate tailored application materials with Groq or OpenRouter.


## Highlights

- Kanban-style application board with Wishlist, Applied, Interviewing, Offer, and Rejected stages.
- Manual job creation with company, title, location, salary, notes, URL, and markdown description.
- Smart job import from a posting URL using AI-assisted extraction.
- Live job search based on profile, skills, resume text, location, salary, work mode, and exclusions.
- Public job-board search through free public APIs first.
- AI ranking and tailoring through the active provider, including Groq free-tier models.
- Optional OpenRouter web-search fallback for broader discovery when OpenRouter credits are available.
- Profile management with resume upload.
- Resume parsing for PDF, TXT, and Markdown files.
- Tailored AI generation for cover letters, resume bullet points, and interview prep.
- Separate API keys and model selections for OpenRouter and Groq.
- Connect, disconnect, delete key, refresh model list, searchable model input, and model dropdown controls.
- Browser localStorage persistence for jobs, profile, settings, and resume data.
- Dark, responsive interface with a floating top navigation bar.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Server Actions
- Cheerio
- lucide-react
- OpenRouter API
- Groq API
- Remotive public jobs API
- Remote OK public jobs API
- pdf.js loaded on demand from CDN for PDF text extraction

## Project Structure

```text
src/
  app/
    actions.ts        Server actions for scraping, public job search, AI ranking, AI generation, and model loading
    globals.css       Global theme, typography, inputs, buttons, and animations
    layout.tsx        Root app layout
    page.tsx          Main app state, localStorage sync, and modal orchestration
  components/
    AddJobModal.tsx       Manual job creation and AI URL import
    Board.tsx             Kanban board and drag/drop columns
    JobDetailsModal.tsx   Job detail view, notes, generated materials, delete/update actions
    JobSearchModal.tsx    Live job search, match scoring, source links, and add selected jobs
    ProfileModal.tsx      Profile fields, resume upload, PDF/TXT/MD parsing
    SettingsModal.tsx     Provider settings, separate keys, model loading, connect/disconnect/delete
    TopNav.tsx            Floating navigation and provider status
  types/
    index.ts              Shared job, profile, provider, settings, and search types
```

## How Live Job Search Works

The app no longer depends only on OpenRouter web search.

Search flow:

1. Fetch live public jobs from free public job-board APIs:
   - Remotive: `https://remotive.com/api/remote-jobs`
   - Remote OK: `https://remoteok.com/api`
2. Filter and deduplicate results.
3. Score results against your profile, skills, target role, location, work mode, and keywords.
4. Use the active AI provider, Groq or OpenRouter, to rank and tailor the results.
5. If public board results are empty and an OpenRouter key is available, use OpenRouter web search as a fallback.

This means Groq can be used for the free-tier AI ranking path, while OpenRouter web search remains optional.

## AI Providers

The app supports two providers:

### Groq

Best for:

- Free-tier friendly usage.
- Fast ranking of public job-board results.
- Cover letter, resume bullet, and interview question generation.

Default Groq model:

```text
llama-3.3-70b-versatile
```

Groq key page:

```text
https://console.groq.com/keys
```

### OpenRouter

Best for:

- Access to many model families.
- Optional web-search fallback when credits are available.
- Using models such as Gemini, Claude, OpenAI, DeepSeek, Llama, and Perplexity through one API.

Default OpenRouter model:

```text
google/gemini-2.5-flash
```

OpenRouter key page:

```text
https://openrouter.ai/keys
```

## Settings Behavior

Settings stores API keys separately per provider:

- OpenRouter key is stored under the OpenRouter provider.
- Groq key is stored under the Groq provider.
- Switching providers no longer copies one key into the other provider.
- Each provider can have its own selected model.
- Each provider has its own connected/disconnected state.

Available settings controls:

- Provider switcher.
- API key input.
- Show/hide key.
- Connect.
- Disconnect.
- Delete Key.
- Searchable model input.
- Model dropdown.
- Refresh model list.

If model loading fails, the app shows built-in fallback models.

## Getting Started

### Prerequisites

- Node.js 20 or newer recommended.
- npm.
- Optional Groq API key.
- Optional OpenRouter API key.

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create `.env.local` in the project root if you want server-side provider keys:

```env
GROQ_API_KEY=your_groq_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
NEXT_PUBLIC_HAS_ENV_KEY=true
```

You can also skip environment variables and enter keys in the Settings modal.

### Run Development Server

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

## Main Workflows

### Configure AI Provider

1. Open Settings.
2. Choose Groq or OpenRouter.
3. Paste the provider-specific API key.
4. Select a model from the dropdown or type a model id.
5. Click Connect.

### Search Live Jobs

1. Click Search Jobs.
2. Enter target role, location, work mode, salary target, keywords, exclusions, and notes.
3. Optionally enable clarifying questions.
4. Click Search Jobs.
5. Review:
   - Company
   - Title
   - Location
   - Salary
   - Source URL
   - Match score
   - Match reason
   - Gaps
   - Suggested resume keywords
6. Select jobs and click Add Selected.
7. Selected jobs are added to Wishlist.

### Add a Job Manually

1. Click Add Job.
2. Fill in company and title.
3. Add location, salary, description, URL, notes, and status.
4. Click Add to Board.

### Import Job Details From URL

1. Click Add Job.
2. Paste a job posting URL.
3. Click Import Details.
4. Review and edit the extracted fields.
5. Add the job to the board.

### Upload Resume Context

1. Open Profile.
2. Upload a PDF, TXT, or Markdown resume.
3. The app extracts resume text in the browser.
4. Save the profile.

Uploaded resume text is used as extra AI context for matching and generation.

### Generate AI Materials

1. Open a job card.
2. Choose Cover Letter, Resume Bullets, or Interview Prep.
3. Click Generate.
4. Copy or regenerate the output.

## Resume Storage

Resume data is stored in browser localStorage:

- `resumeName`: original file name.
- `resumeData`: base64 file data for download/retrieval.
- `resumeText`: extracted text used in prompts.

Uploaded files are limited to 4 MB because localStorage typically has a small storage limit.

## Local Storage Keys

The app stores local data under:

```text
jp_jobs
jp_profile
jp_config
```

Clearing browser storage resets jobs, profile, resume data, API settings, provider keys, and selected models.

## API and Search Notes

- Remotive and Remote OK provide the first-pass live job data.
- Groq can rank and tailor those public job results without needing OpenRouter credits.
- OpenRouter web search is optional fallback behavior.
- OpenRouter web search may require credits and can fail with provider-side errors.
- If OpenRouter returns a 500 from web search, the app should still return public-board results when available.

## Troubleshooting

### OpenRouter Search Error 500

OpenRouter web-search tools are beta and credit-priced. A 500 can happen because of provider/tool behavior or credit/tool availability. The app now avoids relying on this path first.

Use Groq as the active provider if you want the free-tier ranking path:

1. Settings.
2. Select Groq.
3. Add Groq key.
4. Select `llama-3.3-70b-versatile`.
5. Connect.
6. Use Search Jobs.

### OpenRouter Key Appears in Groq

This should be fixed. Keys are stored separately by provider. If you still see old behavior from previous localStorage data, click Delete Key for the wrong provider or clear `jp_config` from browser localStorage.

### Models Not Showing

Use Refresh in Settings. The dropdown always contains fallback models even if live model loading fails.

Groq live model loading requires a Groq key. OpenRouter public model loading may work without a key, but API behavior can vary.

## Security and Privacy

- API keys entered in Settings are stored in browser localStorage.
- For safer deployment, prefer environment variables.
- Resume text and profile details are sent to the active AI provider when ranking jobs or generating materials.
- Live job search sends search preferences and public job snippets to the active AI provider for ranking.
- OpenRouter web-search fallback sends search preferences/profile context to OpenRouter.
- Rotate any API key that has been pasted into logs, screenshots, or chat messages.

## Deployment

This project is ready for Vercel deployment.

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add environment variables if desired.
4. Deploy.

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build production app
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License
MIT

