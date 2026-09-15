import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);
const [recruiter] = await sql`SELECT id FROM users WHERE role = 'recruiter' LIMIT 1`;
const [cur] = await sql`
  SELECT COUNT(*)::int AS c FROM applications a
  JOIN jobs j ON j.id = a.job_id
  WHERE j.recruiter_id = ${recruiter.id} AND a.created_at >= NOW() - INTERVAL '7 days'`;
const [prev] = await sql`
  SELECT COUNT(*)::int AS c FROM applications a
  JOIN jobs j ON j.id = a.job_id
  WHERE j.recruiter_id = ${recruiter.id}
    AND a.created_at >= NOW() - INTERVAL '14 days'
    AND a.created_at <= NOW() - INTERVAL '7 days'`;
console.log("weekly:", cur.c, "prev:", prev.c);
await sql.end();
