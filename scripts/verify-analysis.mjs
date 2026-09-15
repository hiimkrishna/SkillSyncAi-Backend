// E2E: seed two different parsed resumes, analyze each, confirm
// different scores + fileName returned.
import "dotenv/config";
import postgres from "postgres";

const API = "http://localhost:5000";
const s = Date.now().toString(36);
const P = "password123";
const j = (r) => r.json();
const sql = postgres(process.env.DATABASE_URL);

await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "A Cand", email: `a-cand-${s}@test.com`, password: P, role: "candidate" }) });
const ct = (await j(await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: `a-cand-${s}@test.com`, password: P }) }))).token;

const me = await j(await fetch(`${API}/api/candidates/me`, { headers: { Authorization: `Bearer ${ct}` } }));
const profileId = me.profile?.id || me.data?.id || me.id;

const rich = { skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS"], experience: [{ role: "Dev", company: "X", description: "Improved speed by 30% for 10k users" }], education: [{ degree: "BSc", institution: "DU", year: "2022" }], headline: "Dev" };
const thin = { skills: ["HTML"], experience: [], education: [] };

await sql`INSERT INTO resumes (candidate_id, file_name, file_url, mime_type, raw_text, resume_data, parse_status) VALUES (${profileId}, 'rich.pdf', '/uploads/rich.pdf', 'application/pdf', ${"a@b.com 555-1234 Experience with React Docker AWS Education BSc DU " + "x".repeat(900)}, ${sql.json(rich)}, 'completed')`;
await sql`INSERT INTO resumes (candidate_id, file_name, file_url, mime_type, raw_text, resume_data, parse_status) VALUES (${profileId}, 'thin.pdf', '/uploads/thin.pdf', 'application/pdf', 'brief cv text', ${sql.json(thin)}, 'completed')`;

const [thinRow] = await sql`SELECT id FROM resumes WHERE candidate_id = ${profileId} AND file_name = 'thin.pdf'`;
const richRes = await j(await fetch(`${API}/api/ai/resume/analyze`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ct}` }, body: JSON.stringify({}) }));
console.log("latest(rich) ats:", richRes.data?.atsScore, "complete:", richRes.data?.completeness);
const thinRes = await j(await fetch(`${API}/api/resumes/${thinRow.id}/analyze`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ct}` }, body: JSON.stringify({}) }).catch(() => null));
console.log("thin via resumes route:", JSON.stringify(thinRes)?.slice(0, 120) ?? "n/a");

const got = await j(await fetch(`${API}/api/ai/resume/analysis?resumeId=${thinRow.id}`, { headers: { Authorization: `Bearer ${ct}` } }));
console.log("analysis w/ resumeId → file:", got.data?.fileName, "ats:", got.data?.aiAnalysis?.atsScore);
await sql.end();
