// Direct-SQL migration for supervisor mods.
// Do NOT use `drizzle-kit push` (known drift on applications table).
// Usage: node scripts/migrate-supervisor-mods.mjs
import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

const statements = [
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_skills jsonb NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_match_score integer NOT NULL DEFAULT 0`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_experience_years integer NOT NULL DEFAULT 0`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education_requirement text`,
  `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_education_grade real`,
  `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reschedule_request jsonb`,
  `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reschedule_status varchar(20) NOT NULL DEFAULT 'none'`,
  `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz`,
];

try {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
    console.log("OK:", stmt.slice(0, 70));
  }
  console.log("Migration complete.");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
