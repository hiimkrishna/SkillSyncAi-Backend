import { parseResume } from './src/modules/resumes/parsing/resume.parser.js';

const text = `Mid-Level Next.js / Full-Stack Developer

Problem solved

Solutions / Freelance Engineering Dhaka, Bangladesh Tech Stack: Next

Key features

- Uttara, Dhaka, Bangladesh PROFESSIONAL SUMMARY Software Engineer with 3+ years of experience building high
- performance, scalable web applications specializing in Next.js (App Router, Server Components, SSR/SSG/ISR), TypeScript, and PostgreSQL. Proven track record architecting modular full
- stack architectures, integrating complex REST/GraphQL APIs, implementing robust role
- grade web applications utilizing Next.js App Router and React Server Components (RSC), slashing initial load times by 42% and boosting Lighthouse performance scores to 95%. Implemented responsive, accessible UI design systems with shadcn/ui and Tailwind CSS, improving UI consistency and development velocity by 35%. Engineered robust backend API integrations and modular Fastify micro`;

const res = await parseResume(text);
const projectText = (res.projects || []).map((p) => `${p.name || ''} ${p.description || ''}`).join(' ');
const abnormal = /mid[- ]level.*next|full[- ]stack developer|problem solved|key features|solutions\s*\/|freelance engineering/i.test(projectText);

console.log(JSON.stringify({
  experience: res.experience.slice(0, 3),
  projects: res.projects.slice(0, 3),
  abnormal,
  projectText,
}, null, 2));

process.exit(abnormal ? 1 : 0);
