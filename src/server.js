import "dotenv/config";
import app from "./app.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import { runInterviewReminderSweep } from "./modules/interviews/interview.service.js";

await app.register(adminRoutes, {
  prefix: "/api/admin",
});

// ============================================
// AUTOMATIC 24H INTERVIEW REMINDERS
// Sweeps every 15 min for interviews starting
// within the next 24h that were never reminded.
// ============================================

const REMINDER_SWEEP_MS = 15 * 60 * 1000;

const runReminderSweepSafe = async () => {
  try {
    const result = await runInterviewReminderSweep();
    if (result.checked > 0) {
      console.log(
        `[reminders] checked=${result.checked} reminded=${result.reminded}`,
      );
    }
  } catch (error) {
    console.error("[reminders] sweep failed:", error.message);
  }
};

const start = async () => {
  try {
    // Railway injects PORT dynamically; 0.0.0.0 lets its proxy route in.
    const port = Number(process.env.PORT) || 5000;

    await app.listen({
      port,
      host: "0.0.0.0",
    });

    console.log(`SkillSync API running on port ${port}`);

    setInterval(runReminderSweepSafe, REMINDER_SWEEP_MS);
    setTimeout(runReminderSweepSafe, 30 * 1000);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();