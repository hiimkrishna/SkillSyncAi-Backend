import "dotenv/config";
import postgres from "postgres";

const API = "http://localhost:5000";
const sql = postgres(process.env.DATABASE_URL);
const [u] = await sql`SELECT id, email FROM users WHERE role = 'candidate' AND email LIKE 'a-cand-%' ORDER BY created_at DESC LIMIT 1`;
console.log("user:", u?.email);
const login = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: "password123" }) });
const { token } = await login.json();
const res = await fetch(`${API}/api/ai/resume/analyze`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({}) });
console.log("status:", res.status);
console.log((await res.text()).slice(0, 500));
await sql.end();
