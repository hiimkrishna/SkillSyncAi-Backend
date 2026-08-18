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
// ============================================

await app.register(cors, {
  origin: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
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

// ============================================
// HEALTH CHECK
// ============================================

app.get("/", async () => {
  return {
    success: true,
    message: "SkillSync API running",
  };
});

// ============================================
// EXPORT
// ============================================

export default app;