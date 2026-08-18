import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { candidateProfiles } from "../../db/schema/candidate-profiles.js";
import { users } from "../../db/schema/users.js";

import {
  calculateProfileCompletion,
} from "../../utils/profile-completion.js";

// ============================================
// GET CANDIDATE PROFILE
// ============================================

export const getCandidateProfile = async (userId) => {
  // ============================================
  // GET USER
  // ============================================

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

  // ============================================
  // ROLE CHECK
  // ============================================

  if (user.role !== "candidate") {
    throw new Error("User is not a candidate");
  }

  // ============================================
  // FIND PROFILE
  // ============================================

  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .limit(1);

  // ============================================
  // CREATE EMPTY PROFILE IF NEEDED
  // ============================================

  if (!profile) {
    const [createdProfile] = await db
      .insert(candidateProfiles)
      .values({
        userId,

        phone: null,
        location: null,
        headline: null,
        bio: null,

        skills: [],
        education: [],
        experience: [],
        certifications: [],
        portfolio: [],
        socialLinks: {},
      })
      .returning();

    // ============================================
    // SINGLE PROFILE COMPLETION CALCULATION
    // ============================================

    const completion =
      calculateProfileCompletion(
        createdProfile
      );

    return {
      id: createdProfile.id,
      userId: createdProfile.userId,

      fullName: user.fullName,
      email: user.email,
      role: user.role,

      phone: createdProfile.phone,
      location: createdProfile.location,
      headline: createdProfile.headline,
      bio: createdProfile.bio,

      skills: createdProfile.skills,
      education: createdProfile.education,
      experience: createdProfile.experience,
      certifications:
        createdProfile.certifications,
      portfolio: createdProfile.portfolio,
      socialLinks:
        createdProfile.socialLinks,

      // ========================================
      // PROFILE COMPLETION
      // ========================================

      profileCompletion:
        completion,

      createdAt:
        createdProfile.createdAt,

      updatedAt:
        createdProfile.updatedAt,
    };
  }

  // ============================================
  // EXISTING PROFILE
  // ============================================

  const completion =
    calculateProfileCompletion(profile);

  return {
    id: profile.id,
    userId: profile.userId,

    fullName: user.fullName,
    email: user.email,
    role: user.role,

    phone: profile.phone,
    location: profile.location,
    headline: profile.headline,
    bio: profile.bio,

    skills: profile.skills,
    education: profile.education,
    experience: profile.experience,
    certifications:
      profile.certifications,
    portfolio: profile.portfolio,
    socialLinks:
      profile.socialLinks,

    // ==========================================
    // PROFILE COMPLETION
    // ==========================================

    profileCompletion:
      completion,

    createdAt:
      profile.createdAt,

    updatedAt:
      profile.updatedAt,
  };
};

// ============================================
// CREATE CANDIDATE PROFILE
// ============================================

export const createCandidateProfile = async (
  userId,
  data = {}
) => {
  const existing = await db
    .select()
    .from(candidateProfiles)
    .where(
      eq(
        candidateProfiles.userId,
        userId
      )
    )
    .limit(1);

  if (existing[0]) {
    throw new Error(
      "Candidate profile already exists"
    );
  }

  const [profile] = await db
    .insert(candidateProfiles)
    .values({
      userId,

      phone: data.phone ?? null,
      location: data.location ?? null,
      headline: data.headline ?? null,
      bio: data.bio ?? null,

      skills: data.skills ?? [],
      education: data.education ?? [],
      experience: data.experience ?? [],
      certifications:
        data.certifications ?? [],
      portfolio: data.portfolio ?? [],
      socialLinks:
        data.socialLinks ?? {},
    })
    .returning();

  // ============================================
  // PROFILE COMPLETION
  // ============================================

  const completion =
    calculateProfileCompletion(profile);

  return {
    ...profile,

    profileCompletion:
      completion,
  };
};

// ============================================
// UPDATE CANDIDATE PROFILE
// ============================================

export const updateCandidateProfile = async (
  userId,
  data
) => {
  const [profile] = await db
    .update(candidateProfiles)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      eq(
        candidateProfiles.userId,
        userId
      )
    )
    .returning();

  // ============================================
  // PROFILE DOES NOT EXIST
  // ============================================

  if (!profile) {
    return createCandidateProfile(
      userId,
      data
    );
  }

  // ============================================
  // RECALCULATE USING SAME UTILITY
  // ============================================

  const completion =
    calculateProfileCompletion(profile);

  return {
    ...profile,

    profileCompletion:
      completion,
  };
};