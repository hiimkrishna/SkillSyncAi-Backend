// Verifies: interview attached to /applications/my + dashboard upcomingInterviews.
const API = "http://localhost:5000";
const s = Date.now().toString(36);
const P = "password123";
const j = (r) => r.json();

const login = async (email) =>
  (await j(await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: P }) }))).token;

await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "M Rec", email: `m-rec-${s}@test.com`, password: P, role: "recruiter" }) });
await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "M Cand", email: `m-cand-${s}@test.com`, password: P, role: "candidate" }) });

const admin = await login("admin@test.com");
const pending = await j(await fetch(`${API}/api/admin/recruiters/pending`, { headers: { Authorization: `Bearer ${admin}` } }));
const entry = pending.recruiters.find((u) => u.email === `m-rec-${s}@test.com`);
await fetch(`${API}/api/admin/recruiters/${entry.id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${admin}` } });

const rt = await login(`m-rec-${s}@test.com`);
const ct = await login(`m-cand-${s}@test.com`);

const job = await j(await fetch(`${API}/api/jobs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${rt}` }, body: JSON.stringify({ title: "Online Tester", company: "Merge Co", description: "Remote online testing role for QA staff.", type: "remote", status: "open" }) }));
const app = await j(await fetch(`${API}/api/applications`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ct}` }, body: JSON.stringify({ jobId: job.job.id }) }));

const future = new Date(Date.now() + 2 * 864e5).toISOString();
await fetch(`${API}/api/interviews`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${rt}` }, body: JSON.stringify({ applicationId: app.data.id, type: "online", scheduledAt: future, meetingLink: "https://meet.google.com/abc-defg-hij" }) });

const mine = await j(await fetch(`${API}/api/applications/my`, { headers: { Authorization: `Bearer ${ct}` } }));
const first = mine.data[0];
console.log("app status:", first.status);
console.log("interview attached:", Boolean(first.interview), "| type:", first.interview?.type, "| link:", first.interview?.meetingLink);

const dash = await j(await fetch(`${API}/api/dashboard`, { headers: { Authorization: `Bearer ${ct}` } }));
console.log("dashboard upcomingInterviews:", dash.data?.upcomingInterviews?.length, "| first link:", dash.data?.upcomingInterviews?.[0]?.meetingLink);
console.log("dashboard interview stat:", JSON.stringify(dash.data?.quickStats?.find((x) => x.title === "Interviews")));
