import "dotenv/config";
import postgres from "postgres";

const API = "http://localhost:5000";
const sql = postgres(process.env.DATABASE_URL);
const [rich] = await sql`SELECT id, candidate_id FROM resumes WHERE file_name = 'rich.pdf' ORDER BY created_at DESC LIMIT 1`;
const [user] = await sql`SELECT u.email FROM users u JOIN candidate_profiles p ON p.user_id = u.id WHERE p.id = ${rich.candidate_id}`;
const login = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "password123" }) });
const { token } = await login.json();
await fetch(`${API}/api/ai/resume/analyze`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ resumeId: rich.id }) });
const res = await fetch(`${API}/api/ai/resume/analysis?resumeId=${rich.id}`, { headers: { Authorization: `Bearer ${token}` } });
const body = await res.json();
console.log("rich file:", body.data?.fileName, "ats:", body.data?.aiAnalysis?.atsScore, "complete:", body.data?.aiAnalysis?.completeness, "sections:", JSON.stringify(body.data?.aiAnalysis?.sectionScores));
await sql.end();
