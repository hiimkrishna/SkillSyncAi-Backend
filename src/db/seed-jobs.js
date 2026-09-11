import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "./index.js";
import { jobs } from "./schema/jobs.js";
import { users } from "./schema/users.js";

const seededJobs = [
  {
    title: "Software Engineer",
    company: "Northstar Labs",
    location: "Bengaluru, India",
    type: "full-time",
    salaryMin: 1400000,
    salaryMax: 2200000,
    description:
      "Build reliable product experiences for a fast-growing collaboration platform. You will work with product, design, and infrastructure teams to ship well-tested features used by thousands of teams.",
    requirements:
      "2+ years of professional software engineering experience\nStrong proficiency in JavaScript or TypeScript and one backend language\nExperience building and consuming REST APIs\nWorking knowledge of SQL, Git, testing, and code review\nClear written and verbal communication",
    applicationDeadline: "2026-10-15",
  },
  {
    title: "AI Engineer",
    company: "Cognitive Forge",
    location: "Hyderabad, India",
    type: "full-time",
    salaryMin: 1800000,
    salaryMax: 3000000,
    description:
      "Design and productionize intelligent features powered by large language models and classical machine learning. You will own experiments from evaluation through monitored production rollout.",
    requirements:
      "3+ years in machine learning or applied AI\nStrong Python skills and experience with PyTorch or similar frameworks\nHands-on experience with LLM APIs, RAG, embeddings, and evaluation\nUnderstanding of data pipelines, model monitoring, and responsible AI\nExperience deploying services on AWS, GCP, or Azure",
    applicationDeadline: "2026-10-20",
  },
  {
    title: "Data Scientist",
    company: "Veridian Health",
    location: "Remote - India",
    type: "remote",
    salaryMin: 1600000,
    salaryMax: 2600000,
    description:
      "Turn complex healthcare data into decisions that improve patient outcomes. This role combines statistical modeling, experimentation, and close partnership with clinical and product stakeholders.",
    requirements:
      "3+ years of experience in data science or applied statistics\nAdvanced SQL and Python proficiency\nExperience with experimentation, forecasting, and predictive modeling\nAbility to explain technical findings to non-technical audiences\nExperience with pandas, scikit-learn, and dashboarding tools",
    applicationDeadline: "2026-10-25",
  },
  {
    title: "Data Analyst",
    company: "Atlas Commerce",
    location: "Mumbai, India",
    type: "full-time",
    salaryMin: 900000,
    salaryMax: 1500000,
    description:
      "Help commercial teams understand customer behavior, funnel performance, and revenue drivers. You will build trusted reporting and answer high-impact questions with rigor and speed.",
    requirements:
      "1-3 years of experience in analytics\nStrong SQL and spreadsheet skills\nExperience with Tableau, Power BI, Looker, or an equivalent BI tool\nComfort defining metrics and validating data quality\nCuriosity, attention to detail, and strong stakeholder communication",
    applicationDeadline: "2026-10-10",
  },
  {
    title: "Frontend Engineer",
    company: "Brightline Studio",
    location: "Pune, India",
    type: "full-time",
    salaryMin: 1200000,
    salaryMax: 2000000,
    description:
      "Create accessible, responsive interfaces for a modern financial workflow product. Partner with designers and backend engineers to turn thoughtful product concepts into polished experiences.",
    requirements:
      "2+ years building production web applications\nStrong React and modern JavaScript skills\nSolid HTML, CSS, accessibility, and responsive design fundamentals\nExperience with component systems, testing, and performance optimization\nFamiliarity with Next.js and TypeScript is a plus",
    applicationDeadline: "2026-10-18",
  },
  {
    title: "Backend Engineer",
    company: "Orbit Systems",
    location: "Chennai, India",
    type: "full-time",
    salaryMin: 1500000,
    salaryMax: 2400000,
    description:
      "Develop secure, observable services that support high-volume customer workflows. You will contribute to architecture decisions, reliability improvements, and pragmatic engineering standards.",
    requirements:
      "3+ years building backend services\nProficiency in Node.js, Java, Go, or Python\nExperience with PostgreSQL and API design\nUnderstanding of authentication, authorization, queues, and observability\nComfort participating in on-call and incident reviews",
    applicationDeadline: "2026-10-22",
  },
  {
    title: "DevOps Engineer",
    company: "CloudHarbor",
    location: "Remote - India",
    type: "remote",
    salaryMin: 1700000,
    salaryMax: 2800000,
    description:
      "Make delivery safer and infrastructure easier to operate. You will improve CI/CD, cloud foundations, observability, and developer workflows for multiple product teams.",
    requirements:
      "3+ years in DevOps, SRE, or platform engineering\nHands-on AWS or Azure experience\nStrong Docker, Kubernetes, and infrastructure-as-code skills\nExperience with GitHub Actions, Terraform, and monitoring\nA practical approach to reliability, security, and automation",
    applicationDeadline: "2026-11-01",
  },
  {
    title: "Product Designer",
    company: "Kindred Apps",
    location: "New Delhi, India",
    type: "full-time",
    salaryMin: 1000000,
    salaryMax: 1800000,
    description:
      "Shape simple, useful experiences for people managing their professional growth. You will take problems from discovery to shipped interface in a collaborative product team.",
    requirements:
      "3+ years of product design experience\nA portfolio showing end-to-end UX and UI work\nStrong interaction design, prototyping, and visual design skills\nExperience running user research and usability testing\nAbility to collaborate closely with engineering and product",
    applicationDeadline: "2026-10-12",
  },
  {
    title: "QA Automation Engineer",
    company: "SentryPeak Software",
    location: "Kochi, India",
    type: "full-time",
    salaryMin: 1000000,
    salaryMax: 1700000,
    description:
      "Raise confidence in every release by building dependable automated tests and quality practices. You will work across web, API, and integration layers with engineers and product managers.",
    requirements:
      "2+ years in software quality or test automation\nExperience with Playwright, Cypress, Selenium, or equivalent\nStrong API testing and debugging skills\nComfort writing maintainable test plans and CI checks\nA quality mindset focused on customer impact, not only test counts",
    applicationDeadline: "2026-10-28",
  },
  {
    title: "Machine Learning Intern",
    company: "Cognitive Forge",
    location: "Hyderabad, India",
    type: "internship",
    salaryMin: 300000,
    salaryMax: 500000,
    description:
      "Join the applied AI team for a structured internship focused on data preparation, model experiments, evaluation, and responsible deployment practices. This is a hands-on role with mentorship.",
    requirements:
      "Currently pursuing a degree in computer science, statistics, or a related field\nFoundational Python and machine learning knowledge\nUnderstanding of probability, linear algebra, and model evaluation\nCoursework or projects using pandas and scikit-learn\nStrong learning mindset and ability to document experiments",
    applicationDeadline: "2026-10-05",
  },
];

const seedJobs = async () => {
  const [recruiter] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.email, "recruiter@test.com"),
        eq(users.role, "recruiter"),
        eq(users.approvalStatus, "approved"),
        eq(users.isActive, true),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  if (!recruiter) {
    throw new Error(
      "No active approved recruiter found. Create or approve a recruiter before seeding jobs.",
    );
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.update(jobs).set({ deletedAt: now });

    for (const job of seededJobs) {
      const [existing] = await tx
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(eq(jobs.title, job.title), eq(jobs.company, job.company)))
        .limit(1);

      const values = {
        recruiterId: recruiter.id,
        ...job,
        type: job.type,
        status: "open",
        applicationDeadline: new Date(`${job.applicationDeadline}T23:59:59.999Z`),
        deletedAt: null,
        updatedAt: now,
      };

      if (existing) {
        await tx.update(jobs).set(values).where(eq(jobs.id, existing.id));
      } else {
        await tx.insert(jobs).values(values);
      }
    }
  });

  console.log(`Seeded ${seededJobs.length} professional jobs.`);
};

seedJobs()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());