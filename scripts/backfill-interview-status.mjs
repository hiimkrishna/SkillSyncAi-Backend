// One-time backfill: applications that already have a live
// (scheduled/rescheduled) interview but are still stuck on
// pending/screening/shortlisted move to "interview".
// Usage: node scripts/backfill-interview-status.mjs
import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

const rows = await sql`
  UPDATE applications a
  SET status = 'interview', updated_at = NOW()
  FROM interviews i
  WHERE i.application_id = a.id
    AND i.status IN ('scheduled', 'rescheduled')
    AND i.deleted_at IS NULL
    AND a.status IN ('pending', 'screening', 'shortlisted')
    AND a.deleted_at IS NULL
  RETURNING a.id`;

console.log(`Backfilled ${rows.length} application(s) to interview stage.`);
await sql.end();
