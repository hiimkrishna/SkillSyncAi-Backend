import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();
const sql = postgres(process.env.DATABASE_URL, {ssl:'require'});
const rows = await sql`SELECT id, email, full_name FROM users WHERE full_name ILIKE '%KRISHNA%' LIMIT 5`;
console.log(rows);
for(const u of rows){
  const prof = await sql`SELECT id FROM candidate_profiles WHERE user_id = ${u.id} LIMIT 1`;
  console.log('profile', prof);
  if(prof.length){
    const resumes = await sql`SELECT id, file_name, ai_analysis, ai_analyzed_at, created_at FROM resumes WHERE candidate_id = ${prof[0].id} AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 3`;
    console.log('resumes', JSON.stringify(resumes, null, 2).slice(0,4000));
  }
}
await sql.end();
