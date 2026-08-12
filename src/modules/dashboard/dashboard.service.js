import { eq, desc, count } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users } from "../../db/schema/users.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";
import { jobs } from "../../db/schema/jobs.js";
import { applications } from "../../db/schema/applications.js";

export const getDashboardData = async (userId) => {
  // Get candidate
  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role !== "candidate") {
    throw new Error("Candidate access required");
  }

  // Get candidate profile
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);

  // Get application count
  const [applicationCount] = await db
    .select({
      count: count(),
    })
    .from(applications)
    .where(eq(applications.candidateId, userId));

  // Get open jobs
  const recommendedJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "open"))
    .orderBy(desc(jobs.createdAt))
    .limit(10);

  return {
    profile: {
      id: profile?.id ?? null,
      userId: user.id,

      fullName: user.fullName,
      email: user.email,
      role: user.role,

      phone: profile?.phone ?? null,
      location: profile?.location ?? null,
      headline: profile?.headline ?? null,
      bio: profile?.bio ?? null,

      skills: profile?.skills ?? [],
      education: profile?.education ?? [],
      experience: profile?.experience ?? [],
      certifications: profile?.certifications ?? [],
      portfolio: profile?.portfolio ?? [],
      socialLinks: profile?.socialLinks ?? {},
    },

    stats: {
      applications: Number(applicationCount?.count ?? 0),
      interviews: 0,
      savedJobs: 0,
    },

    recommendedJobs,
  };
};