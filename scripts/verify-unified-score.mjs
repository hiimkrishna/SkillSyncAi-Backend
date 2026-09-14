// Asserts one score everywhere: /jobs/match, /ai/recommended-jobs,
// /jobs/:id/eligibility must agree per candidate+job; gate blocks <80
// with best-fit steps.
const API = "http://localhost:5000";
const s = Date.now().toString(36);
const P = "password123";
const j = (r) => r.json();
const auth = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

const login = async (email) =>
  (await j(await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: P }) }))).token;

await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "U Rec", email: `u-rec-${s}@test.com`, password: P, role: "recruiter" }) });
await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "U Cand", email: `u-cand-${s}@test.com`, password: P, role: "candidate" }) });

const admin = await login("admin@test.com");
const pending = await j(await fetch(`${API}/api/admin/recruiters/pending`, { headers: { Authorization: `Bearer ${admin}` } }));
const entry = pending.recruiters.find((u) => u.email === `u-rec-${s}@test.com`);
await fetch(`${API}/api/admin/recruiters/${entry.id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${admin}` } });

const rt = await login(`u-rec-${s}@test.com`);
const ct = await login(`u-cand-${s}@test.com`);

await fetch(`${API}/api/candidates/me`, { method: "PUT", headers: auth(ct), body: JSON.stringify({
  headline: "Python Backend Developer",
  location: "Dhaka",
  skills: ["Python", "FastAPI", "PostgreSQL"],
  education: [{ institution: "Dhaka College", degree: "BSc in Computer Science", year: "2022", grade: "3.6" }],
  experience: [{ role: "Backend Developer", company: "X", period: "2021-2024", years: 3, summary: "Built Python FastAPI services with PostgreSQL" }],
}) });

const job = await j(await fetch(`${API}/api/jobs`, { method: "POST", headers: auth(rt), body: JSON.stringify({ title: "Python Backend Developer", company: "Unified Co", description: "Python backend developer building FastAPI services with PostgreSQL daily.", location: "Dhaka", type: "full-time", requirements: "Python, FastAPI, PostgreSQL, Docker", status: "open" }) }));
const jobId = job.job.id;

const match = await j(await fetch(`${API}/api/jobs/match?limit=50`, { headers: { Authorization: `Bearer ${ct}` } }));
const matchRow = match.data.find((r) => r.jobId === jobId);

const aiRaw = await fetch(`${API}/api/ai/recommended-jobs?limit=30`, { headers: { Authorization: `Bearer ${ct}` } });
const aiRecs = await aiRaw.json();
if (!aiRaw.ok) console.log("AI RECS ERROR:", aiRaw.status, JSON.stringify(aiRecs).slice(0, 300));
const aiRow = aiRecs.data?.find((r) => r.jobId === jobId);

const eligRaw = await fetch(`${API}/api/jobs/${jobId}/eligibility`, { headers: { Authorization: `Bearer ${ct}` } });
const elig = await eligRaw.json();
if (!eligRaw.ok) console.log("ELIG ERROR:", eligRaw.status, JSON.stringify(elig).slice(0, 300));

const a = matchRow?.matchScore;
const b = aiRow?.score;
const c = elig.data?.matchScore;
console.log(`jobs/match: ${a} | ai/recommended-jobs: ${b} | eligibility: ${c}`);
console.log(a === b && b === c ? "PASS identical scores" : "FAIL scores differ");

const apply = await fetch(`${API}/api/applications`, { method: "POST", headers: auth(ct), body: JSON.stringify({ jobId }) });
console.log("apply status:", apply.status, c >= 80 ? "(expect 201)" : "(expect 422)");
if (apply.status === 422) {
  const body = await apply.json();
  console.log("bestFitSteps:", (body.eligibility?.bestFitSteps ?? []).length, "(expect >0)");
  console.log("first step:", body.eligibility?.bestFitSteps?.[0]?.title ?? "—");
} else {
  // Force a block on a second strict job to inspect guidance.
  const strict = await j(await fetch(`${API}/api/jobs`, { method: "POST", headers: auth(rt), body: JSON.stringify({ title: "Kubernetes Wizard", company: "Unified Co", description: "Deep Kubernetes and Go expertise required.", type: "full-time", requiredSkills: ["Kubernetes", "Go"], minMatchScore: 90, status: "open" }) }));
  const blocked = await fetch(`${API}/api/applications`, { method: "POST", headers: auth(ct), body: JSON.stringify({ jobId: strict.job.id }) });
  const bbody = await blocked.json();
  console.log("strict apply status:", blocked.status, "(expect 422)");
  console.log("bestFitSteps:", (bbody.eligibility?.bestFitSteps ?? []).length, "(expect >0)");
  console.log("first step:", bbody.eligibility?.bestFitSteps?.[0]?.title ?? "—");
}
