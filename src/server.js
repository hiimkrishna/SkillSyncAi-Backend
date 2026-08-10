import app from "./app.js";
import adminRoutes from "./modules/admin/admin.routes.js";

await app.register(adminRoutes, {
  prefix: "/api/admin",
});

const start = async () => {
  try {
    await app.listen({
      port: 5000,
      host: "0.0.0.0",
    });

    console.log("SkillSync API running on http://localhost:5000");
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();