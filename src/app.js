import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./modules/auth/auth.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import candidateRoutes from "./modules/candidates/candidate.routes.js";
const app = Fastify({ logger: true }); // Allow frontend to communicate with backend
await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
await app.register(authPlugin);
app.register(authRoutes, { prefix: "/api/auth" });
await app.register(settingsRoutes, {
  prefix: "/api/settings",
});

await app.register(candidateRoutes, {
  prefix: "/api/candidates",
});
app.get("/", async () => {
  return { message: "SkillSync API running" };
});
export default app;
