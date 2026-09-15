import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";

import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================
// PLUGINS
// ============================================

import authPlugin from "./plugins/auth.js";

// ============================================
// ROUTES
// ============================================

import authRoutes from "./modules/auth/auth.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import candidateRoutes from "./modules/candidates/candidate.routes.js";
import jobRoutes from "./modules/jobs/job.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import applicationRoutes from "./modules/applications/application.routes.js";
import resumeRoutes from "./modules/resumes/resume.routes.js";
import savedJobsRoutes from "./modules/saved-jobs/saved-jobs.routes.js";
import recruiterRoutes from "./modules/recruiters/recruiter.routes.js";
import interviewRoutes from "./modules/interviews/interview.routes.js";
import paymentRoutes from "./modules/payments/payment.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
// ============================================
// PATH CONFIGURATION
// ============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// FASTIFY APP
// ============================================

const app = Fastify({
  logger: true,
});

// ============================================
// STATIC FILES
// ============================================

await app.register(fastifyStatic, {
  root: path.join(__dirname, "../uploads"),
  prefix: "/uploads/",
});

// ============================================
// CORS
// Production (Railway): locked to FRONTEND_URL (comma-separated for
// Vercel production + preview domains), credentials on.
// Development: open for localhost work.
// ============================================

const parseOrigins = (value) =>
  String(value ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const prodOrigins = parseOrigins(process.env.FRONTEND_URL);
const isProduction = process.env.NODE_ENV === "production";

console.log(
  `[cors] NODE_ENV=${process.env.NODE_ENV} origins=${prodOrigins.length > 0 ? prodOrigins.join(",") : "(open)"}`,
);

await app.register(cors, {
  origin: (origin, cb) => {
    // Same-origin / curl / Railway health checks have no Origin.
    if (!origin) return cb(null, true);
    if (!isProduction || prodOrigins.length === 0) return cb(null, true);
    const clean = String(origin).replace(/\/+$/, "");
    // Allow explicit FRONTEND_URL entries plus any Vercel preview deployment.
    if (prodOrigins.includes(clean) || /\.vercel\.app$/.test(clean)) {
      return cb(null, true);
    }
    return cb(new Error(`CORS blocked for origin ${origin}`), false);
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],
});

// ============================================
// MULTIPART / FILE UPLOADS
// ============================================

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
});

// ============================================
// AUTHENTICATION / AUTHORIZATION
// ============================================

await app.register(authPlugin);

// ============================================
// AUTH ROUTES
// ============================================

await app.register(authRoutes, {
  prefix: "/api/auth",
});

// ============================================
// RESUME ROUTES
// ============================================

await app.register(resumeRoutes, {
  prefix: "/api/resumes",
});

// ============================================
// SETTINGS ROUTES
// ============================================

await app.register(settingsRoutes, {
  prefix: "/api/settings",
});

// ============================================
// CANDIDATE ROUTES
// ============================================

await app.register(candidateRoutes, {
  prefix: "/api/candidates",
});

// ============================================
// DASHBOARD ROUTES
// ============================================

await app.register(dashboardRoutes, {
  prefix: "/api/dashboard",
});

// ============================================
// APPLICATION ROUTES
// ============================================

await app.register(applicationRoutes, {
  prefix: "/api/applications",
});

// ============================================
// JOB ROUTES
// ============================================

await app.register(jobRoutes, {
  prefix: "/api/jobs",
});

// ============================================
// SAVED JOBS ROUTES
// ============================================

await app.register(savedJobsRoutes, {
  prefix: "/api/saved-jobs",
});

await app.register(interviewRoutes, {
  prefix: "/api/interviews",
});

await app.register(paymentRoutes, {
  prefix: "/api/payments",
});

await app.register(aiRoutes, {
  prefix: "/api/ai",
});

await app.register(
  recruiterRoutes,
  {
    prefix: "/api/recruiters",
  }
 );


// ============================================
// HEALTH CHECKS
// ============================================

app.get("/", async () => {
  return {
    success: true,
    message: "SkillSync API running",
  };
});

// Lightweight probe for Railway + frontend availability checks.
app.get("/health", async () => {
  return {
    status: "ok",
    uptime: process.uptime(),
  };
});

// ============================================
// EXPORT
// ============================================

export default app;
