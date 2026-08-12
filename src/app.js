import Fastify from "fastify";
import cors from "@fastify/cors";

import authPlugin from "./plugins/auth.js";

import authRoutes from "./modules/auth/auth.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import candidateRoutes from "./modules/candidates/candidate.routes.js";
import jobRoutes from "./modules/jobs/job.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import applicationRoutes from "./modules/applications/application.routes.js";
import resumeRoutes from "./modules/resumes/resume.routes.js";

const app = Fastify({
  logger: true,
});

// Allow frontend to communicate with backend
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

// Authentication / Authorization
await app.register(authPlugin);

// Auth
await app.register(authRoutes, {
  prefix: "/api/auth",
});

//Resumes
await app.register(resumeRoutes, {
  prefix: "/api/resumes",
});

// Settings
await app.register(settingsRoutes, {
  prefix: "/api/settings",
});

// Candidate
await app.register(candidateRoutes, {
  prefix: "/api/candidates",
});
// Candidate Dashboard
await app.register(dashboardRoutes, {
  prefix: "/api/dashboard",
});
//Applications
await app.register(applicationRoutes, {
  prefix: "/api/applications",
});

// Jobs
await app.register(jobRoutes, {
  prefix: "/api/jobs",
});

// Health check
app.get("/", async () => {
  return {
    message: "SkillSync API running",
  };
});

export default app;