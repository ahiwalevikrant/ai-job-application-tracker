import mysql from 'mysql2/promise';
import { JobCard, UserProfile } from '../types';

const DEFAULT_DATABASE = 'job_portal';

type JobRow = {
  id: string;
  company: string;
  title: string;
  description: string;
  url: string | null;
  status: JobCard['status'];
  date_added: string;
  notes: string | null;
  salary: string | null;
  location: string | null;
  cover_letter: string | null;
  resume_bullets: string | null;
  interview_questions: string | null;
};

type ProfileRow = {
  name: string;
  target_title: string;
  skills: string;
  experience_summary: string;
  resume_name: string | null;
  resume_data: string | null;
  resume_text: string | null;
};

let pool: mysql.Pool | null = null;
let initialized = false;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || DEFAULT_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return pool;
}

async function ensureDatabase() {
  if (initialized) return;

  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      target_title VARCHAR(500) NOT NULL,
      skills TEXT NOT NULL,
      experience_summary LONGTEXT NOT NULL,
      resume_name VARCHAR(500) NULL,
      resume_data LONGTEXT NULL,
      resume_text LONGTEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id VARCHAR(64) PRIMARY KEY,
      company VARCHAR(255) NOT NULL,
      title VARCHAR(500) NOT NULL,
      description LONGTEXT NOT NULL,
      url TEXT NULL,
      status VARCHAR(32) NOT NULL,
      date_added VARCHAR(40) NOT NULL,
      notes LONGTEXT NULL,
      salary VARCHAR(255) NULL,
      location VARCHAR(255) NULL,
      cover_letter LONGTEXT NULL,
      resume_bullets LONGTEXT NULL,
      interview_questions LONGTEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  initialized = true;
}

function mapJob(row: JobRow): JobCard {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    description: row.description,
    url: row.url || undefined,
    status: row.status,
    dateAdded: row.date_added,
    notes: row.notes || undefined,
    salary: row.salary || undefined,
    location: row.location || undefined,
    coverLetter: row.cover_letter || undefined,
    resumeBullets: row.resume_bullets || undefined,
    interviewQuestions: row.interview_questions || undefined,
  };
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    name: row.name,
    targetTitle: row.target_title,
    skills: row.skills,
    experienceSummary: row.experience_summary,
    resumeName: row.resume_name || undefined,
    resumeData: row.resume_data || undefined,
    resumeText: row.resume_text || undefined,
  };
}

export async function getProfile() {
  await ensureDatabase();
  const [rows] = await getPool().query('SELECT * FROM user_profiles WHERE id = 1 LIMIT 1');
  const profileRows = rows as ProfileRow[];
  return profileRows[0] ? mapProfile(profileRows[0]) : null;
}

export async function saveProfile(profile: UserProfile) {
  await ensureDatabase();
  await getPool().execute(
    `INSERT INTO user_profiles (
      id, name, target_title, skills, experience_summary, resume_name, resume_data, resume_text
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      target_title = VALUES(target_title),
      skills = VALUES(skills),
      experience_summary = VALUES(experience_summary),
      resume_name = VALUES(resume_name),
      resume_data = VALUES(resume_data),
      resume_text = VALUES(resume_text)`,
    [
      profile.name,
      profile.targetTitle,
      profile.skills,
      profile.experienceSummary,
      profile.resumeName || null,
      profile.resumeData || null,
      profile.resumeText || null,
    ]
  );
  return profile;
}

export async function getJobs() {
  await ensureDatabase();
  const [rows] = await getPool().query('SELECT * FROM jobs ORDER BY date_added DESC, updated_at DESC');
  return (rows as JobRow[]).map(mapJob);
}

export async function saveJob(job: JobCard) {
  await ensureDatabase();
  await getPool().execute(
    `INSERT INTO jobs (
      id, company, title, description, url, status, date_added, notes, salary, location,
      cover_letter, resume_bullets, interview_questions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      company = VALUES(company),
      title = VALUES(title),
      description = VALUES(description),
      url = VALUES(url),
      status = VALUES(status),
      date_added = VALUES(date_added),
      notes = VALUES(notes),
      salary = VALUES(salary),
      location = VALUES(location),
      cover_letter = VALUES(cover_letter),
      resume_bullets = VALUES(resume_bullets),
      interview_questions = VALUES(interview_questions)`,
    [
      job.id,
      job.company,
      job.title,
      job.description,
      job.url || null,
      job.status,
      job.dateAdded,
      job.notes || null,
      job.salary || null,
      job.location || null,
      job.coverLetter || null,
      job.resumeBullets || null,
      job.interviewQuestions || null,
    ]
  );
  return job;
}

export async function saveJobs(jobs: JobCard[]) {
  await Promise.all(jobs.map((job) => saveJob(job)));
  return jobs;
}

export async function deleteJob(id: string) {
  await ensureDatabase();
  await getPool().execute('DELETE FROM jobs WHERE id = ?', [id]);
}
