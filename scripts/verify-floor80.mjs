// Verifies the platform 80+ floor: weak blocked on an open job, strong admitted.
const API = "http://localhost:5000";
const s = Date.now().toString(36);
const P = "password123";
const j = (r) => r.json();
const auth = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

const login = async (email) =>
  (await j(await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: P }) }))).token;

await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "F Rec", email: `f-rec-${s}@test.com`, password: P, role: "recruiter" }) });
await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Weak Cand", email: `f-weak-${s}@test.com`, password: P, role: "candidate" }) });
await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Strong Cand", email: `f-strong-${s}@test.com`, password: P, role: "candidate" }) });

const admin = await login("admin@test.com");
const pending = await j(await fetch(`${API}/api/admin/recruiters/pending`, { headers: { Authorization: `Bearer ${admin}` } }));
const entry = pending.recruiters.find((u) => u.email === `f-rec-${s}@test.com`);
await fetch(`${API}/api/admin/recruiters/${entry.id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${admin}` } });

const rt = await login(`f-rec-${s}@test.com`);
const weak = await login(`f-weak-${s}@test.com`);
const strong = await login(`f-strong-${s}@test.com`);

// Wide-open job: NO recruiter filters at all.
const job = await j(await fetch(`${API}/api/jobs`, { method: "POST", headers: auth(rt), body: JSON.stringify({ title: "React Developer", company: "Floor Co", description: "React developer building web apps with React every day.", location: "Dhaka", type: "full-time", status: "open" }) }));
const jobId = job.job.id;

// Weak candidate: unrelated profile.
await fetch(`${API}/api/candidates/me`, { method: "PUT", headers: auth(weak), body: JSON.stringify({ headline: "Shop assistant", skills: ["Cashier"], education: [], experience: [] }) });
const weakElig = await j(await fetch(`${API}/api/jobs/${jobId}/eligibility`, { headers: { Authorization: `Bearer ${weak}` } }));
console.log("weak score:", weakElig.data?.matchScore, "| eligible:", weakElig.data?.eligible);
const weakApply = await fetch(`${API}/api/applications`, { method: "POST", headers: auth(weak), body: JSON.stringify({ jobId }) });
console.log("weak apply status:", weakApply.status, "(expect 422)");

// Strong candidate: headline + skill + location + experience all aligned.
await fetch(`${API}/api/candidates/me`, { method: "PUT", headers: auth(strong), body: JSON.stringify({
  headline: "React Developer",
  location: "Dhaka",
  skills: ["React"],
  education: [],
  experience: [{ role: "React Developer", company: "X", period: "2021-2024", summary: "Built web apps with React daily" }],
}) });
const strongElig = await j(await fetch(`${API}/api/jobs/${jobId}/eligibility`, { headers: { Authorization: `Bearer ${strong}` } }));
console.log("strong score:", strongElig.data?.matchScore, "| eligible:", strongElig.data?.eligible);
const strongApply = await fetch(`${API}/api/applications`, { method: "POST", headers: auth(strong), body: JSON.stringify({ jobId }) });
console.log("strong apply status:", strongApply.status, "(expect 201)");
