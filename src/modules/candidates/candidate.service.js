import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";
import { users } from "../../db/schema/users.js";

export const getCandidateProfile = async (userId) => {
  const result = await db
    .select({
      id: candidateProfiles.id,
      userId: candidateProfiles.userId,

      fullName: users.fullName,
      email: users.email,
      role: users.role,

      phone: candidateProfiles.phone,
      location: candidateProfiles.location,
      headline: candidateProfiles.headline,
      bio: candidateProfiles.bio,

      skills: candidateProfiles.skills,
      education: candidateProfiles.education,
      experience: candidateProfiles.experience,
      certifications: candidateProfiles.certifications,
      portfolio: candidateProfiles.portfolio,
      socialLinks: candidateProfiles.socialLinks,

      createdAt: candidateProfiles.createdAt,
      updatedAt: candidateProfiles.updatedAt,
    })
    .from(candidateProfiles)
    .innerJoin(
      users,
      eq(candidateProfiles.userId, users.id)
    )
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);

  return result[0] || null;
};

export const createCandidateProfile = async (userId, data) => {
  const existing = await getCandidateProfile(userId);

  if (existing) {
    throw new Error("Candidate profile already exists");
  }

  const result = await db
    .insert(candidateProfiles)
    .values({
      userId,
      ...data,
    })
    .returning();

  return result[0];
};

export const updateCandidateProfile = async (userId, data) => {
  const result = await db
    .update(candidateProfiles)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(candidateProfiles.userId, userId))
    .returning();

  if (!result[0]) {
    return null;
  }

  // Return the complete profile including user information
  return getCandidateProfile(userId);
};