import { eq, isNull, and, desc } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../../db/index.js";
import { applications } from "../../db/schema/applications.js";
import { jobs } from "../../db/schema/jobs.js";
import { getApplicationById } from "../applications/application.service.js";
import { resumes } from "../../db/schema/resumes.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";

import { callAIJSON } from "./ai.client.js";
import {
  buildEvaluationPrompt,
  normalizeEvaluation,
  EVALUATION_VERSION,
} from "./prompts/evaluation.prompt.js";
import {
  buildInterviewQuestionsPrompt,
  normalizeQuestions,
} from "./prompts/interview-questions.prompt.js";
import {
  buildResumeAnalysisPrompt,
  normalizeResumeAnalysis,
  RESUME_ANALYSIS_VERSION,
} from "./prompts/resume-analysis.prompt.js";
import {
  buildJobRecommendationPrompt,
  normalizeRecommendations,
} from "./prompts/job-recommendation.prompt.js";
import { scoreCandidateForJob } from "../jobs/job.match.service.js";

// ============================================
// HELPERS
// ============================================

const getResumeForCandidate = async (candidateId) => {
  // candidateId is users.id — need candidateProfiles.id then resumes
  const [profile] = await db
    .select({ id: candidateProfiles.id })
    .from(candidateProfiles)
    .where(and(eq(candidateProfiles.userId, candidateId), isNull(candidateProfiles.deletedAt)))
    .limit(1);

  if (!profile) return null;

  const [resume] = await db
    .select({
      id: resumes.id,
      rawText: resumes.rawText,
      resumeData: resumes.resumeData,
      fileName: resumes.fileName,
    })
    .from(resumes)
    .where(and(eq(resumes.candidateId, profile.id), isNull(resumes.deletedAt)))
    .orderBy(resumes.createdAt)
    .limit(1);

  // fallback: latest resume by that candidate via resumes.candidateId = profile.id, already handled
  // also try by userId directly if needed
  return resume ?? null;
};

const getProfileForCandidate = async (candidateId) => {
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(and(eq(candidateProfiles.userId, candidateId), isNull(candidateProfiles.deletedAt)))
    .limit(1);
  return profile ?? null;
};

// ============================================
// EVALUATE CANDIDATE (resume + JD + whole profile)
// ============================================

export const evaluateApplication = async (applicationId, recruiterId) => {
  // Fetch application with authorization
  const application = await getApplicationById(applicationId, recruiterId, "recruiter");
  if (!application) {
    const err = new Error("Application not found or not authorized");
    err.statusCode = 404;
    throw err;
  }

  const jobId = application.jobId || application.job?.id;
  if (!jobId) {
    const err = new Error("Job not found for application");
    err.statusCode = 404;
    throw err;
  }

  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
    .limit(1);

  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }

  // Get resume + whole profile — AI compiles both for first impression
  const resume = await getResumeForCandidate(application.candidateId);
  const profileData = await getProfileForCandidate(application.candidateId);

  const resumeData = resume?.resumeData || {};
  const rawText = resume?.rawText || "";

  // Allow evaluation if either resume or profile has data (user asked to compile both)
  const hasResumeContent = rawText || resumeData?.skills?.length || resumeData?.experience?.length;
  const hasProfileContent =
    profileData?.skills?.length || profileData?.experience?.length || profileData?.headline || profileData?.bio;

  if (!hasResumeContent && !hasProfileContent) {
    const err = new Error("No resume or profile data available for evaluation. Candidate should update whole profile and upload resume.");
    err.statusCode = 422;
    throw err;
  }

  const { system, user } = buildEvaluationPrompt({ job, resumeData, rawText, profileData });

  let rawEvaluation;
  try {
    rawEvaluation = await callAIJSON({ system, user, temperature: 0.2 });
  } catch (e) {
    const err = new Error(`AI evaluation failed: ${e.message}`);
    err.statusCode = 502;
    throw err;
  }

  const normalized = normalizeEvaluation(rawEvaluation);

  // Persist
  const [updated] = await db
    .update(applications)
    .set({
      aiEvaluation: normalized,
      aiEvaluatedAt: new Date(),
      aiEvaluationVersion: EVALUATION_VERSION,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId))
    .returning();

  return updated?.aiEvaluation ?? normalized;
};

export const getEvaluation = async (applicationId, recruiterId) => {
  const application = await getApplicationById(applicationId, recruiterId, "recruiter");
  if (!application) {
    const err = new Error("Application not found");
    err.statusCode = 404;
    throw err;
  }

  const [row] = await db
    .select({
      aiEvaluation: applications.aiEvaluation,
      aiEvaluatedAt: applications.aiEvaluatedAt,
      interviewQuestions: applications.interviewQuestions,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  return row ?? { aiEvaluation: null, interviewQuestions: null };
};

// ============================================
// INTERVIEW QUESTIONS
// ============================================

export const generateInterviewQuestions = async (applicationId, recruiterId, count = 5) => {
  const application = await getApplicationById(applicationId, recruiterId, "recruiter");
  if (!application) {
    const err = new Error("Application not found");
    err.statusCode = 404;
    throw err;
  }

  const jobId = application.jobId || application.job?.id;
  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt))).limit(1);
  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }

  const resume = await getResumeForCandidate(application.candidateId);
  const resumeData = resume?.resumeData || application.candidate || {};
  const rawText = resume?.rawText || "";

  const { system, user } = buildInterviewQuestionsPrompt({ job, resumeData, rawText, count });

  let raw;
  try {
    raw = await callAIJSON({ system, user, temperature: 0.4 });
  } catch (e) {
    const err = new Error(`AI question generation failed: ${e.message}`);
    err.statusCode = 502;
    throw err;
  }

  const questions = normalizeQuestions(raw, count);

  const [updated] = await db
    .update(applications)
    .set({
      interviewQuestions: questions,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId))
    .returning({ interviewQuestions: applications.interviewQuestions });

  return updated?.interviewQuestions ?? questions;
};

// ============================================
// RESUME ANALYSIS (candidate)
// ============================================

const getResumeForUser = async (userId) => {
  const [profile] = await db
    .select({ id: candidateProfiles.id })
    .from(candidateProfiles)
    .where(and(eq(candidateProfiles.userId, userId), isNull(candidateProfiles.deletedAt)))
    .limit(1);
  if (!profile) return null;
  const [resume] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.candidateId, profile.id), isNull(resumes.deletedAt)))
    .orderBy(desc(resumes.createdAt))
    .limit(1);
  return resume ?? null;
};

export const analyzeResumeForCandidate = async (userId, resumeId = null) => {
  let resume;
  if (resumeId) {
    const [profile] = await db
      .select({ id: candidateProfiles.id })
      .from(candidateProfiles)
      .where(and(eq(candidateProfiles.userId, userId), isNull(candidateProfiles.deletedAt)))
      .limit(1);
    if (!profile) {
      const err = new Error("Candidate profile not found");
      err.statusCode = 404;
      throw err;
    }
    const [r] = await db
      .select()
      .from(resumes)
      .where(
        and(eq(resumes.id, resumeId), eq(resumes.candidateId, profile.id), isNull(resumes.deletedAt)),
      )
      .limit(1);
    resume = r;
  } else {
    resume = await getResumeForUser(userId);
  }

  if (!resume) {
    const err = new Error("No resume found to analyze");
    err.statusCode = 404;
    throw err;
  }

  const resumeData = resume.resumeData || {};
  const rawText = resume.rawText || "";

  const analysisInputHash = createHash("sha256")
    .update(JSON.stringify({ rawText, resumeData }))
    .digest("hex");

  if (
    resume.aiAnalysis?.version === RESUME_ANALYSIS_VERSION &&
    resume.aiAnalysis?.analysisInputHash === analysisInputHash
  ) {
    return resume.aiAnalysis;
  }

  if (!rawText && !resumeData?.skills?.length && !resumeData?.experience?.length) {
    const err = new Error("Resume has no extractable content");
    err.statusCode = 422;
    throw err;
  }

  const { system, user } = buildResumeAnalysisPrompt({ resumeData, rawText });

  let raw;
  let normalized;
  try {
    raw = await callAIJSON({ system, user, temperature: 0 });
    normalized = normalizeResumeAnalysis(raw, analysisInputHash);
  } catch (e) {
    // Fallback deterministic analysis so UX never times out
    const { fallbackResumeAnalysis } = await import("./prompts/resume-analysis.prompt.js");
    normalized = fallbackResumeAnalysis(resumeData, rawText, analysisInputHash);
    // Annotate fallback for debugging
    normalized.fallback = true;
    normalized.fallbackReason = e.message;
  }

  const [updated] = await db
    .update(resumes)
    .set({
      aiAnalysis: normalized,
      aiAnalyzedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(resumes.id, resume.id))
    .returning({ aiAnalysis: resumes.aiAnalysis });

  return updated?.aiAnalysis ?? normalized;
};

export const getResumeAnalysis = async (userId, resumeId = null) => {
  let resume;
  if (resumeId) {
    const [profile] = await db
      .select({ id: candidateProfiles.id })
      .from(candidateProfiles)
      .where(and(eq(candidateProfiles.userId, userId), isNull(candidateProfiles.deletedAt)))
      .limit(1);
    if (!profile) return null;
    const [r] = await db
      .select({ aiAnalysis: resumes.aiAnalysis, aiAnalyzedAt: resumes.aiAnalyzedAt })
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.candidateId, profile.id), isNull(resumes.deletedAt)))
      .limit(1);
    return r;
  }
  resume = await getResumeForUser(userId);
  if (!resume) return null;
  return { aiAnalysis: resume.aiAnalysis, aiAnalyzedAt: resume.aiAnalyzedAt, resumeId: resume.id };
};

// ============================================
// AUTO EVALUATION ON APPLY — candidate glance
// ============================================

export const autoGenerateEvaluationForApplication = async (applicationId) => {
  try {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), isNull(applications.deletedAt)))
      .limit(1);
    if (!app) return null;

    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, app.jobId), isNull(jobs.deletedAt)))
      .limit(1);
    if (!job) return null;

    // Prevent re-generation if already evaluated
    if (app.aiEvaluation) return app.aiEvaluation;

    const resume = await getResumeForCandidate(app.candidateId);
    const profileData = await getProfileForCandidate(app.candidateId);
    const resumeData = resume?.resumeData || {};
    const rawText = resume?.rawText || "";

    const hasResumeContent = rawText || resumeData?.skills?.length || resumeData?.experience?.length;
    const hasProfileContent =
      profileData?.skills?.length || profileData?.experience?.length || profileData?.headline || profileData?.bio;

    if (!hasResumeContent && !hasProfileContent) {
      return null;
    }

    const { system, user } = buildEvaluationPrompt({ job, resumeData, rawText, profileData });

    let normalized;
    try {
      const raw = await callAIJSON({ system, user, temperature: 0.2 });
      normalized = normalizeEvaluation(raw);
    } catch (e) {
      // Fallback deterministic glance — compiled from resume + whole profile
      const combinedSkills = [
        ...(Array.isArray(resumeData.skills) ? resumeData.skills : []),
        ...(Array.isArray(profileData?.skills) ? profileData.skills : []),
      ];
      const mergedSkills = [...new Set(combinedSkills.map((s) => String(typeof s === "string" ? s : s?.name || "").trim()).filter(Boolean))].slice(0, 5);
      const expCount =
        (Array.isArray(resumeData.experience) ? resumeData.experience.length : 0) +
        (Array.isArray(profileData?.experience) ? profileData.experience.length : 0);
      normalized = normalizeEvaluation({
        score: 65,
        overallScore: 65,
        matchedSkills: mergedSkills,
        missingSkills: [],
        strengths: [
          `${expCount} experience entries (resume + profile)`,
          `${mergedSkills.length} skills listed`,
          profileData?.headline ? `Headline: ${profileData.headline}` : "Profile available",
        ],
        concerns: ["AI summary pending — showing compiled fallback glance"],
        summary: `${profileData?.headline || resumeData.headline || "Candidate"} with ${mergedSkills.join(", ") || "listed skills"} — compiled from resume and whole profile. Experience: ${expCount} roles.`,
        skillMatchPercent: 60,
        experienceRelevance: "medium",
        recommendation: "maybe",
        atsKeywordsMatched: mergedSkills.slice(0, 3),
      });
      normalized.fallback = true;
    }

    const [updated] = await db
      .update(applications)
      .set({
        aiEvaluation: normalized,
        aiEvaluatedAt: new Date(),
        aiEvaluationVersion: EVALUATION_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId))
      .returning({ aiEvaluation: applications.aiEvaluation });

    return updated?.aiEvaluation ?? normalized;
  } catch (e) {
    console.error("[AI auto-evaluation] failed for", applicationId, e.message);
    return null;
  }
};

// ============================================
// JOB RECOMMENDATIONS (AI-ranked existing jobs)
// ============================================

export const recommendJobsForCandidate = async (userId, limit = 10) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

  const openJobs = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, "open"), isNull(jobs.deletedAt)))
    .orderBy(desc(jobs.createdAt))
    .limit(30);

  if (!openJobs.length) return [];

  // THE unified score (merged profile + parsed resume) — the exact same
  // number /jobs/match shows and the apply gate enforces. The LLM only
  // ever contributes reason sentences, never numbers.
  const scored = [];
  for (const job of openJobs) {
    const s = await scoreCandidateForJob(userId, job);
    if (!s.hasUsableData && s.matchScore === 0) continue;
    scored.push({
      jobId: job.id,
      score: s.matchScore,
      matchedSkills: s.matchedSkills,
      missingSkills: s.missingSkills,
      reason: s.reason,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        description: job.description,
        requirements: job.requirements,
        status: job.status,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        applicationDeadline: job.applicationDeadline,
        createdAt: job.createdAt,
      },
    });
  }

  if (!scored.length) {
    const err = new Error(
      "Complete your profile and upload a resume to get AI job matches.",
    );
    err.statusCode = 404;
    throw err;
  }

  // Optional LLM polish: borrow its reason sentences onto our rows.
  try {
    const { snapshot } = await scoreCandidateForJob(userId, openJobs[0]);
    const { system, user } = buildJobRecommendationPrompt({
      resumeData: snapshot.mergedResumeData,
      rawText: snapshot.rawText,
      jobs: openJobs,
    });
    const raw = await callAIJSON({ system, user, temperature: 0.2 });
    const normalized = normalizeRecommendations(raw, openJobs);
    const reasonsByJob = new Map(
      normalized
        .filter((r) => r.reason)
        .map((r) => [String(r.jobId), r.reason]),
    );
    for (const row of scored) {
      const llmReason = reasonsByJob.get(String(row.jobId));
      if (llmReason) row.reason = llmReason;
    }
  } catch {
    // LLM unavailable — deterministic reasons stand.
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit);
};
