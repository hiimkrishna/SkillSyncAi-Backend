require("dotenv").config();
const postgres = require("postgres");

(async () => {
  const sql = postgres(process.env.DATABASE_URL);

  const dupes = await sql`
    SELECT candidate_id, job_id, COUNT(*) AS n
    FROM applications
    GROUP BY candidate_id, job_id
    HAVING COUNT(*) > 1
  `;

  if (dupes.length > 0) {
    console.error("DUPLICATES FOUND — aborting:", dupes);
    await sql.end();
    process.exit(1);
  }

  await sql`
    ALTER TABLE applications
    ADD CONSTRAINT applications_candidate_id_job_id_unique
    UNIQUE (candidate_id, job_id)
  `;

  const check = await sql`
    SELECT conname FROM pg_constraint
    WHERE conname = 'applications_candidate_id_job_id_unique'
  `;
  console.log("CONSTRAINT ADDED:", check.map((c) => c.conname).join(", "));

  const total = await sql`SELECT COUNT(*)::int AS n FROM applications`;
  console.log("APPLICATION ROWS PRESERVED:", total[0].n);

  await sql.end();
})().catch((e) => {
  if (e.code === "23505" || /duplicate key/i.test(e.message)) {
    console.log("CONSTRAINT ALREADY EXISTS — nothing to do");
    process.exit(0);
  }
  console.error("FAILED:", e.message);
  process.exit(1);
});
