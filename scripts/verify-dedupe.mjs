// Verifies: second interview for same application retires the first;
// candidate can request a mode switch; recruiter approves it.
const API = "http://localhost:5000";
const s = Date.now().toString(36);
const P = "password123";
const j = (r) => r.json();
const auth = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

const login = async (email) =>
  (await j(await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: P }) }))).token;

await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "D Rec", email: `d-rec-${s}@test.com`, password: P, role: "recruiter" }) });
await fetch(`${API}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "D Cand", email: `d-cand-${s}@test.com`, password: P, role: "candidate" }) });

const admin = await login("admin@test.com");
const pending = await j(await fetch(`${API}/api/admin/recruiters/pending`, { headers: { Authorization: `Bearer ${admin}` } }));
const entry = pending.recruiters.find((u) => u.email === `d-rec-${s}@test.com`);
await fetch(`${API}/api/admin/recruiters/${entry.id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${admin}` } });

const rt = await login(`d-rec-${s}@test.com`);
const ct = await login(`d-cand-${s}@test.com`);

const job = await j(await fetch(`${API}/api/jobs`, { method: "POST", headers: auth(rt), body: JSON.stringify({ title: "Onsite Tester", company: "Dedupe Co", description: "Onsite QA testing role with team collaboration.", type: "full-time", status: "open" }) }));
const app = await j(await fetch(`${API}/api/applications`, { method: "POST", headers: auth(ct), body: JSON.stringify({ jobId: job.job.id }) }));

const sched = async (payload) =>
  j(await fetch(`${API}/api/interviews`, { method: "POST", headers: auth(rt), body: JSON.stringify({ applicationId: app.data.id, ...payload }) }));

const first = await sched({ type: "in_person", scheduledAt: new Date(Date.now() + 2 * 864e5).toISOString(), location: "Dhaka Office" });
console.log("first scheduled:", first.success, first.data?.id);

const second = await sched({ type: "online", scheduledAt: new Date(Date.now() + 3 * 864e5).toISOString(), meetingLink: "https://zoom.us/j/123" });
console.log("second scheduled:", second.success, second.data?.id);

const recList = await j(await fetch(`${API}/api/interviews/recruiter`, { headers: { Authorization: `Bearer ${rt}` } }));
const live = recList.data.filter((i) => i.applicationId === app.data.id);
console.log("live interviews for application:", live.length, "| latest type:", live[0]?.type, "(expect 1, online)");

const candList = await j(await fetch(`${API}/api/interviews/candidate`, { headers: { Authorization: `Bearer ${ct}` } }));
console.log("candidate sees:", candList.data?.length, "(expect 1)");

// Candidate requests in-person instead of virtual.
const req = await j(await fetch(`${API}/api/interviews/${second.data.id}/reschedule-request`, { method: "POST", headers: auth(ct), body: JSON.stringify({ proposedAt: new Date(Date.now() + 4 * 864e5).toISOString(), reason: "Prefer onsite", type: "in_person", location: "Dhaka Office" }) }));
console.log("mode-switch request:", req.success, "| proposed type:", req.data?.rescheduleRequest?.type);

// Recruiter approves → interview flips to in-person.
const resp = await j(await fetch(`${API}/api/interviews/${second.data.id}/reschedule-respond`, { method: "PATCH", headers: auth(rt), body: JSON.stringify({ decision: "approved" }) }));
console.log("approve:", resp.success, "| final type:", resp.data?.type, "| location:", resp.data?.location);
