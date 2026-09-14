import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);
const rows = await sql`
  SELECT i.id, i.status AS istatus, i.scheduled_at, i.type, i.meeting_link,
         i.location, a.status AS astatus, j.title, j.company, u.email AS candidate
  FROM interviews i
  JOIN applications a ON a.id = i.application_id
  JOIN jobs j ON j.id = i.job_id
  JOIN users u ON u.id = i.candidate_id
  WHERE j.company ILIKE '%bytecraft%'
  ORDER BY i.scheduled_at DESC`;
console.log(JSON.stringify(rows, null, 1));
await sql.end();
