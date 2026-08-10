import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./modules/auth/auth.routes.js";
const app = Fastify({ logger: true }); // Allow frontend to communicate with backend
await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
await app.register(authPlugin);
app.register(authRoutes, { prefix: "/api/auth" });
app.get("/", async () => {
  return { message: "SkillSync API running" };
});
export default app;
