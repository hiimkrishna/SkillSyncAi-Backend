// E2E verification for supervisor mods (run while dev server is up).
// Usage: node scripts/verify-supervisor-mods.mjs
const API = "http://localhost:5000";

const stamp = Date.now().toString(36);
const recruiterEmail = `verify-rec-${stamp}@test.com`;
const candidateEmail = `verify-cand-${stamp}@test.com`;
const PASSWORD = "password123";

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
};

const api = async (method, path, token, body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON (PDF) */
  }
  return { status: res.status, json, text };
};

const register = async (role, email) => {
  const r = await api("POST", "/api/auth/register", null, {
    fullName: role === "recruiter" ? "Verify Recruiter" : "Verify Candidate",
    email,
    password: PASSWORD,
    role,
    ...(role === "recruiter" ? { companyName: "Verify Co" } : {}),
  });
  return r;
};

// ---- register both ----
const rr = await register("recruiter", recruiterEmail);
check("recruiter registers", [200, 201].includes(rr.status), `status=${rr.status}`);

const cr = await register("candidate", candidateEmail);
check("candidate registers", [200, 201].includes(cr.status), `status=${cr.status}`);

// ---- recruiter pending -> approve via admin ----
const adminLogin = await api("POST", "/api/auth/login", null, {
  email: "admin@test.com",
  password: PASSWORD,
});
check("admin login", adminLogin.status === 200, `status=${adminLogin.status} ${adminLogin.text.slice(0, 80)}`);
const adminToken = adminLogin.json?.token;

let recLoginBlocked = await api("POST", "/api/auth/login", null, {
  email: recruiterEmail,
  password: PASSWORD,
});
check("recruiter blocked while pending", recLoginBlocked.status !== 200, `status=${recLoginBlocked.status}`);

const pending = await api("GET", "/api/admin/recruiters/pending", adminToken);
const pendingEntry = (pending.json?.data ?? pending.json?.recruiters ?? []).find(
  (u) => u.email === recruiterEmail,
);
check("recruiter in pending list", Boolean(pendingEntry));

if (pendingEntry) {
  const approve = await api(
    "PATCH",
    `/api/admin/recruiters/${pendingEntry.id}/approve`,
    adminToken,
  );
  check("admin approves recruiter", approve.status === 200, `status=${approve.status}`);
}

const recLogin = await api("POST", "/api/auth/login", null, {
  email: recruiterEmail,
  password: PASSWORD,
});
check("recruiter login after approval", recLogin.status === 200, `status=${recLogin.status}`);
const recToken = recLogin.json?.token;

const candLogin = await api("POST", "/api/auth/login", null, {
  email: candidateEmail,
  password: PASSWORD,
});
check("candidate login", candLogin.status === 200, `status=${candLogin.status}`);
const candToken = candLogin.json?.token;

// ---- candidate profile: weak skills, no degree match ----
const profile = await api("PUT", "/api/candidates/me", candToken, {
  headline: "Junior frontend enthusiast",
  skills: ["HTML", "CSS"],
  education: [{ institution: "Local College", degree: "Diploma in Arts", year: "2023" }],
  experience: [{ role: "Intern", company: "Shop", period: "2023", summary: "helped out" }],
});
check("candidate profile set", [200, 201].includes(profile.status), `status=${profile.status} ${profile.text.slice(0, 120)}`);

// ---- recruiter creates STRICT job ----
const jobPayload = {
  title: "Senior React Engineer",
  company: "Verify Co",
  description: "Senior React engineer with deep Next.js and PostgreSQL experience building scalable apps.",
  location: "Dhaka",
  type: "full-time",
  requirements: "React, Next.js, PostgreSQL, Node.js",
  requiredSkills: ["React", "Next.js", "PostgreSQL"],
  minMatchScore: 80,
  minExperienceYears: 3,
  educationRequirement: "Computer Science",
  status: "open",
};
const jobRes = await api("POST", "/api/jobs", recToken, jobPayload);
check("strict job created", jobRes.status === 201, `status=${jobRes.status} ${jobRes.text.slice(0, 160)}`);
const job = jobRes.json?.job ?? jobRes.json?.data;
const jobId = job?.id;
check("job has filter columns", Array.isArray(job?.requiredSkills) && job?.minMatchScore === 80, JSON.stringify({ rs: job?.requiredSkills, mm: job?.minMatchScore }));

// ---- eligibility: should FAIL ----
const elig = await api("GET", `/api/jobs/${jobId}/eligibility`, candToken);
check("eligibility endpoint 200", elig.status === 200, `status=${elig.status}`);
check("weak candidate ineligible", elig.json?.data?.eligible === false, JSON.stringify(elig.json?.data?.reasons));

// ---- apply: should be 422 ----
const applyBlocked = await api("POST", "/api/applications", candToken, { jobId });
check("apply blocked with 422", applyBlocked.status === 422, `status=${applyBlocked.status} ${(applyBlocked.json?.message ?? "").slice(0, 100)}`);

// ---- open job: only a strong (80+) candidate may apply (platform floor) ----
await api("PUT", "/api/candidates/me", candToken, {
  headline: "General Assistant",
  location: "Dhaka",
  skills: ["Coordination"],
  education: [],
  experience: [{ role: "General Assistant", company: "Verify Co", period: "2020-2024", summary: "Daily coordination and office assistance" }],
});
const openJobRes = await api("POST", "/api/jobs", recToken, {
  title: "General Assistant",
  company: "Verify Co",
  description: "General office assistant helping with daily tasks and coordination.",
  location: "Dhaka",
  type: "part-time",
  status: "open",
});
const openJob = openJobRes.json?.job ?? openJobRes.json?.data;
const applyOk = await api("POST", "/api/applications", candToken, { jobId: openJob.id });
check("apply to open job works", applyOk.status === 201, `status=${applyOk.status}`);
const applicationId = applyOk.json?.data?.id;

// ---- recruiter applications + filters ----
const allApps = await api("GET", "/api/applications/recruiter", recToken);
check("recruiter applications list", allApps.status === 200 && (allApps.json?.data?.length ?? 0) >= 1, `count=${allApps.json?.data?.length}`);

const filtered = await api("GET", `/api/applications/recruiter?jobId=${openJob.id}&minExperience=5`, recToken);
check("applicant filter minExperience=5 excludes junior", filtered.status === 200 && (filtered.json?.data?.length ?? -1) === 0, `count=${filtered.json?.data?.length}`);

const filteredEdu = await api("GET", `/api/applications/recruiter?education=Computer%20Science`, recToken);
check("applicant filter education excludes non-matching", filteredEdu.status === 200 && (filteredEdu.json?.data?.length ?? -1) === 0, `count=${filteredEdu.json?.data?.length}`);

// ---- interview schedule (candidate gets email preview in dev) ----
const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
future.setHours(10, 0, 0, 0);
const sched = await api("POST", "/api/interviews", recToken, {
  applicationId,
  type: "online",
  title: "First round",
  scheduledAt: future.toISOString(),
  durationMinutes: 45,
  meetingLink: "https://meet.example.com/abc",
  notes: "Bring portfolio",
});
check("interview scheduled", sched.status === 201, `status=${sched.status} ${sched.text.slice(0, 160)}`);
const interview = sched.json?.data;
const interviewId = interview?.id;
check("schedule email attempted", Boolean(interview?.email), JSON.stringify(interview?.email)?.slice(0, 100));

// ---- candidate sees interview (calendar) ----
const candInterviews = await api("GET", "/api/interviews/candidate", candToken);
check("candidate interviews list", candInterviews.status === 200 && (candInterviews.json?.data?.length ?? 0) >= 1, `count=${candInterviews.json?.data?.length}`);

// ---- candidate requests reschedule ----
const proposed = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
proposed.setHours(14, 0, 0, 0);
const reschedReq = await api("POST", `/api/interviews/${interviewId}/reschedule-request`, candToken, {
  proposedAt: proposed.toISOString(),
  reason: "University exam",
});
check("candidate reschedule request", reschedReq.status === 200, `status=${reschedReq.status} ${reschedReq.text.slice(0, 160)}`);

// ---- recruiter approves ----
const respond = await api("PATCH", `/api/interviews/${interviewId}/reschedule-respond`, recToken, {
  decision: "approved",
});
check("recruiter approves reschedule", respond.status === 200, `status=${respond.status} ${respond.text.slice(0, 160)}`);
check("slot moved to proposed", new Date(respond.json?.data?.scheduledAt).getTime() === proposed.getTime(), respond.json?.data?.scheduledAt);

// ---- PDF reports ----
const candPdf = await fetch(`${API}/api/dashboard/report/pdf`, {
  headers: { Authorization: `Bearer ${candToken}` },
});
const candBuf = Buffer.from(await candPdf.arrayBuffer());
check("candidate report PDF", candPdf.status === 200 && candBuf.subarray(0, 5).toString() === "%PDF-", `status=${candPdf.status} bytes=${candBuf.length}`);

const recPdf = await fetch(`${API}/api/dashboard/report/pdf`, {
  headers: { Authorization: `Bearer ${recToken}` },
});
const recBuf = Buffer.from(await recPdf.arrayBuffer());
check("recruiter report PDF", recPdf.status === 200 && recBuf.subarray(0, 5).toString() === "%PDF-", `status=${recPdf.status} bytes=${recBuf.length}`);

const adminPdf = await fetch(`${API}/api/admin/reports/pdf`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
const adminBuf = Buffer.from(await adminPdf.arrayBuffer());
check("admin report PDF", adminPdf.status === 200 && adminBuf.subarray(0, 5).toString() === "%PDF-", `status=${adminPdf.status} bytes=${adminBuf.length}`);

// ---- reminder sweep (unit-level: interview within 24h) ----
const soon = new Date(Date.now() + 23 * 60 * 60 * 1000);
const sched2 = await api("POST", "/api/interviews", recToken, {
  applicationId,
  type: "online",
  title: "Urgent round",
  scheduledAt: soon.toISOString(),
  durationMinutes: 30,
  meetingLink: "https://meet.example.com/xyz",
});
check("second interview scheduled", sched2.status === 201, `status=${sched2.status}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
